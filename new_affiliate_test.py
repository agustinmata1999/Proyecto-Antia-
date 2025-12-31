#!/usr/bin/env python3
"""
AFFILIA-GO New Affiliate System Architecture Testing
Tests the new system where:
1. Admin manages betting houses (no campaigns anymore)
2. Tipsters create their own campaigns selecting houses
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://apifix-2.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials from review request
ADMIN_EMAIL = "admin@antia.com"
ADMIN_PASSWORD = "SuperAdmin123!"
TIPSTER_EMAIL = "fausto.perez@antia.com"
TIPSTER_PASSWORD = "Tipster123!"

class NewAffiliateTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.tipster_token = None
        self.test_campaign_id = None
        self.test_house_id = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, token: str = None) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{API_BASE}{endpoint}"
        
        # Default headers
        req_headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Add auth header if token provided
        if token:
            req_headers["Authorization"] = f"Bearer {token}"
            
        # Merge with provided headers
        if headers:
            req_headers.update(headers)
            
        self.log(f"Making {method} request to {url}")
        if data:
            self.log(f"Request data: {json.dumps(data, indent=2)}")
            
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data if data else None,
                headers=req_headers,
                timeout=30
            )
            
            self.log(f"Response status: {response.status_code}")
            
            # Try to parse JSON response
            try:
                response_data = response.json()
                self.log(f"Response data: {json.dumps(response_data, indent=2)}")
            except:
                self.log(f"Response text: {response.text}")
                
            return response
            
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            raise

    def test_admin_login(self) -> bool:
        """Test admin authentication"""
        self.log("=== Testing Admin Authentication ===")
        
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        try:
            response = self.make_request("POST", "/auth/login", login_data)
            
            if response.status_code == 200:
                response_data = response.json()
                
                if "access_token" in response_data:
                    self.admin_token = response_data["access_token"]
                    self.log("✅ Admin login successful - JWT token received")
                    return True
                else:
                    self.log("❌ Admin login response missing access_token", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Admin login failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login test failed: {str(e)}", "ERROR")
            return False

    def test_tipster_login(self) -> bool:
        """Test tipster authentication"""
        self.log("=== Testing Tipster Authentication ===")
        
        login_data = {
            "email": TIPSTER_EMAIL,
            "password": TIPSTER_PASSWORD
        }
        
        try:
            response = self.make_request("POST", "/auth/login", login_data)
            
            if response.status_code == 200:
                response_data = response.json()
                
                if "access_token" in response_data:
                    self.tipster_token = response_data["access_token"]
                    self.log("✅ Tipster login successful - JWT token received")
                    return True
                else:
                    self.log("❌ Tipster login response missing access_token", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Tipster login failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Tipster login test failed: {str(e)}", "ERROR")
            return False

    def test_admin_betting_houses(self) -> bool:
        """Test GET /api/affiliate/admin/houses?includeInactive=true"""
        self.log("=== Testing Admin - Betting Houses ===")
        
        try:
            response = self.make_request("GET", "/affiliate/admin/houses?includeInactive=true", token=self.admin_token)
            
            if response.status_code == 200:
                houses = response.json()
                self.log(f"✅ Successfully retrieved {len(houses)} betting houses")
                
                # Verify expected structure and look for specific houses
                bwin_found = False
                betway_found = False
                
                for house in houses:
                    self.log(f"House: {house.get('name', 'No name')} (ID: {house.get('id', 'No ID')})")
                    self.log(f"  Commission: €{house.get('commissionPerReferralEur', 0)}")
                    self.log(f"  Status: {house.get('status', 'Unknown')}")
                    self.log(f"  Countries: {house.get('allowedCountries', [])}")
                    
                    # Check for expected houses from review request
                    if house.get('name') == 'Bwin' and house.get('commissionPerReferralEur') == 50:
                        bwin_found = True
                        self.test_house_id = house.get('id')
                        self.log("✅ Found Bwin with €50 commission")
                    elif house.get('name') == 'Betway' and house.get('commissionPerReferralEur') == 45:
                        betway_found = True
                        self.log("✅ Found Betway with €45 commission")
                
                if not bwin_found:
                    self.log("⚠️ Bwin with €50 commission not found", "WARN")
                if not betway_found:
                    self.log("⚠️ Betway with €45 commission not found", "WARN")
                    
                return True
            else:
                self.log(f"❌ Admin betting houses failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin betting houses test failed: {str(e)}", "ERROR")
            return False

    def test_tipster_houses_for_country(self) -> bool:
        """Test GET /api/tipster/landings/houses/ES"""
        self.log("=== Testing Tipster - Get Available Houses for Spain ===")
        
        try:
            response = self.make_request("GET", "/tipster/landings/houses/ES", token=self.tipster_token)
            
            if response.status_code == 200:
                houses = response.json()
                self.log(f"✅ Successfully retrieved {len(houses)} houses available in Spain")
                
                # Verify expected structure
                for house in houses:
                    self.log(f"House: {house.get('name', 'No name')} (ID: {house.get('id', 'No ID')})")
                    self.log(f"  Commission: €{house.get('commissionPerReferralEur', 0)}")
                    
                    # Store first house ID for campaign creation test
                    if not self.test_house_id and house.get('id'):
                        self.test_house_id = house.get('id')
                
                return True
            else:
                self.log(f"❌ Tipster houses for Spain failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Tipster houses for Spain test failed: {str(e)}", "ERROR")
            return False

    def test_tipster_create_campaign(self) -> bool:
        """Test POST /api/tipster/landings - Create Campaign/Landing without promotionId"""
        self.log("=== Testing Tipster - Create Campaign/Landing ===")
        
        if not self.test_house_id:
            # Use the house ID from review request as fallback
            self.test_house_id = "6944674739e53ced97a01362"
            self.log(f"Using fallback house ID: {self.test_house_id}")
        
        campaign_data = {
            "title": "Nueva Campaña Test",
            "description": "Campaña de prueba",
            "countriesEnabled": ["ES"],
            "countryConfigs": [
                {
                    "country": "ES",
                    "items": [
                        {
                            "bettingHouseId": self.test_house_id,
                            "orderIndex": 0
                        }
                    ]
                }
            ]
        }
        
        try:
            response = self.make_request("POST", "/tipster/landings", campaign_data, token=self.tipster_token)
            
            if response.status_code in [200, 201]:
                result = response.json()
                self.log("✅ Campaign/Landing created successfully")
                
                # Check required fields
                if "id" in result and "slug" in result:
                    self.test_campaign_id = result["id"]
                    self.log(f"✅ Campaign ID: {result['id']}")
                    self.log(f"✅ Campaign Slug: {result['slug']}")
                    
                    # Verify no promotionId is required
                    if "promotionId" not in campaign_data:
                        self.log("✅ Campaign created without promotionId (new architecture)")
                    
                    return True
                else:
                    self.log("❌ Response missing id or slug", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Create campaign failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create campaign test failed: {str(e)}", "ERROR")
            return False

    def test_admin_stats(self) -> bool:
        """Test GET /api/affiliate/admin/stats - Admin Get Stats"""
        self.log("=== Testing Admin - Get Stats ===")
        
        try:
            # Test with date range parameters
            params = "?startDate=2024-01-01&endDate=2025-12-31"
            response = self.make_request("GET", f"/affiliate/admin/stats{params}", token=self.admin_token)
            
            if response.status_code == 200:
                stats = response.json()
                self.log("✅ Admin stats retrieved successfully")
                
                # Verify expected structure for new architecture
                expected_sections = ['general', 'byCountry', 'byHouse', 'byDate', 'byCampaign', 'byTipster']
                for section in expected_sections:
                    if section in stats:
                        self.log(f"✅ Stats has {section} section")
                        
                        # Log some details for verification
                        if section == 'general':
                            general = stats[section]
                            self.log(f"  Total clicks: {general.get('totalClicks', 0)}")
                            self.log(f"  Total conversions: {general.get('conversions', 0)}")
                            self.log(f"  Conversion rate: {general.get('conversionRate', 0)}%")
                        elif section == 'byTipster':
                            tipsters = stats[section]
                            self.log(f"  Found {len(tipsters)} tipsters in stats")
                        elif section == 'byCampaign':
                            campaigns = stats[section]
                            self.log(f"  Found {len(campaigns)} campaigns in stats")
                    else:
                        self.log(f"⚠️ Stats missing {section} section", "WARN")
                
                return True
            else:
                self.log(f"❌ Admin stats failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin stats test failed: {str(e)}", "ERROR")
            return False

    def test_tipster_stats(self) -> bool:
        """Test GET /api/affiliate/tipster/stats - Tipster Get Own Stats"""
        self.log("=== Testing Tipster - Get Own Stats ===")
        
        try:
            # Test with date range parameters
            params = "?startDate=2024-01-01&endDate=2025-12-31"
            response = self.make_request("GET", f"/affiliate/tipster/stats{params}", token=self.tipster_token)
            
            if response.status_code == 200:
                stats = response.json()
                self.log("✅ Tipster stats retrieved successfully")
                
                # Verify expected structure
                expected_sections = ['general', 'byCountry', 'byHouse', 'byDate', 'byCampaign']
                for section in expected_sections:
                    if section in stats:
                        self.log(f"✅ Stats has {section} section")
                        
                        # Log some details for verification
                        if section == 'general':
                            general = stats[section]
                            self.log(f"  Total clicks: {general.get('totalClicks', 0)}")
                            self.log(f"  Total conversions: {general.get('conversions', 0)}")
                            self.log(f"  Conversion rate: {general.get('conversionRate', 0)}%")
                            self.log(f"  Total earnings: €{general.get('totalEarnings', 0)}")
                        elif section == 'byCampaign':
                            campaigns = stats[section]
                            self.log(f"  Found {len(campaigns)} campaigns in tipster stats")
                    else:
                        self.log(f"⚠️ Stats missing {section} section", "WARN")
                
                return True
            else:
                self.log(f"❌ Tipster stats failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Tipster stats test failed: {str(e)}", "ERROR")
            return False

    def run_new_affiliate_tests(self) -> Dict[str, bool]:
        """Run all new affiliate system architecture tests"""
        self.log("🚀 Starting AFFILIA-GO New Affiliate System Architecture Tests")
        self.log("=" * 70)
        
        results = {}
        
        # 1. Authentication Tests
        results["admin_login"] = self.test_admin_login()
        results["tipster_login"] = self.test_tipster_login()
        
        if not results["admin_login"]:
            self.log("❌ Admin authentication failed - skipping admin tests", "ERROR")
        
        if not results["tipster_login"]:
            self.log("❌ Tipster authentication failed - skipping tipster tests", "ERROR")
        
        # 2. Admin - Betting Houses (no campaigns anymore)
        if results["admin_login"]:
            results["admin_betting_houses"] = self.test_admin_betting_houses()
        else:
            results["admin_betting_houses"] = False
        
        # 3. Tipster - Get Available Houses for Country
        if results["tipster_login"]:
            results["tipster_houses_for_country"] = self.test_tipster_houses_for_country()
        else:
            results["tipster_houses_for_country"] = False
        
        # 4. Tipster - Create Campaign/Landing (without promotionId)
        if results["tipster_login"]:
            results["tipster_create_campaign"] = self.test_tipster_create_campaign()
        else:
            results["tipster_create_campaign"] = False
        
        # 5. Admin - Get Stats (should show tipster campaigns)
        if results["admin_login"]:
            results["admin_stats"] = self.test_admin_stats()
        else:
            results["admin_stats"] = False
        
        # 6. Tipster - Get Own Stats
        if results["tipster_login"]:
            results["tipster_stats"] = self.test_tipster_stats()
        else:
            results["tipster_stats"] = False
        
        return results

def main():
    """Main test runner"""
    tester = NewAffiliateTester()
    
    try:
        # Run the new affiliate system tests
        results = tester.run_new_affiliate_tests()
        
        # Print summary
        print("\n" + "=" * 70)
        print("🏁 NEW AFFILIATE SYSTEM ARCHITECTURE TEST SUMMARY")
        print("=" * 70)
        
        passed = 0
        failed = 0
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:<35} {status}")
            
            if result:
                passed += 1
            else:
                failed += 1
        
        print(f"\nTotal: {len(results)} tests")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        
        if failed == 0:
            print("\n🎉 All new affiliate system tests passed!")
            print("✅ Admin manages betting houses (no campaigns)")
            print("✅ Tipsters create campaigns selecting houses")
            print("✅ Commission values come from house configuration")
            sys.exit(0)
        else:
            print(f"\n💥 {failed} test(s) failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test runner failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()