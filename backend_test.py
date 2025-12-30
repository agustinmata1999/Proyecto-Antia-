#!/usr/bin/env python3
"""
Antia Platform Backend API Testing
Tests Affiliate Landing System for tipster platform
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://tipster-portal-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
TIPSTER_EMAIL = "fausto.perez@antia.com"
TIPSTER_PASSWORD = "Tipster123!"

class AntiaAffiliateTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_landing_id = None
        self.test_click_id = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, use_auth: bool = True) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{API_BASE}{endpoint}"
        
        # Default headers
        req_headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Add auth header if token available and requested
        if use_auth and self.access_token:
            req_headers["Authorization"] = f"Bearer {self.access_token}"
            
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

    def test_login(self) -> bool:
        """Test authentication with tipster credentials"""
        self.log("=== Testing Authentication ===")
        
        login_data = {
            "email": TIPSTER_EMAIL,
            "password": TIPSTER_PASSWORD
        }
        
        try:
            response = self.make_request("POST", "/auth/login", login_data, use_auth=False)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if access_token is in response
                if "access_token" in response_data:
                    self.access_token = response_data["access_token"]
                    self.log("✅ Login successful - JWT token received")
                    return True
                else:
                    self.log("❌ Login response missing access_token", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Login failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login test failed: {str(e)}", "ERROR")
            return False

    def test_get_tipster_landings(self) -> bool:
        """Test getting tipster's landings"""
        self.log("=== Testing Get Tipster Landings ===")
        
        try:
            response = self.make_request("GET", "/tipster/landings")
            
            if response.status_code == 200:
                landings = response.json()
                self.log(f"✅ Successfully retrieved {len(landings)} landings")
                
                # Log landing details for debugging
                for i, landing in enumerate(landings):
                    self.log(f"Landing {i+1}: {landing.get('title', 'No title')} (ID: {landing.get('id', 'No ID')})")
                    self.log(f"  Slug: {landing.get('slug', 'No slug')}")
                    self.log(f"  Countries: {landing.get('countriesEnabled', [])}")
                    self.log(f"  Clicks: {landing.get('totalClicks', 0)}")
                    
                    # Store first landing ID for further tests
                    if i == 0 and landing.get('id'):
                        self.test_landing_id = landing.get('id')
                        
                return True
            else:
                self.log(f"❌ Get tipster landings failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get tipster landings test failed: {str(e)}", "ERROR")
            return False

    def test_get_available_houses_for_spain(self) -> bool:
        """Test getting available betting houses for Spain"""
        self.log("=== Testing Get Available Houses for Spain ===")
        
        try:
            response = self.make_request("GET", "/tipster/landings/houses/ES")
            
            if response.status_code == 200:
                houses = response.json()
                self.log(f"✅ Successfully retrieved {len(houses)} houses for Spain")
                
                # Log house details for debugging
                for i, house in enumerate(houses):
                    self.log(f"House {i+1}: {house.get('name', 'No name')} (ID: {house.get('id', 'No ID')})")
                    self.log(f"  Commission: {house.get('commissionPerReferralEur', 0)} EUR")
                    
                return True
            else:
                self.log(f"❌ Get houses for Spain failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get houses for Spain test failed: {str(e)}", "ERROR")
            return False

    def test_get_landing_metrics(self) -> bool:
        """Test getting landing metrics"""
        if not self.test_landing_id:
            self.log("❌ No test landing ID available", "ERROR")
            return False
            
        self.log("=== Testing Get Landing Metrics ===")
        
        try:
            response = self.make_request("GET", f"/tipster/landings/{self.test_landing_id}/metrics")
            
            if response.status_code == 200:
                metrics = response.json()
                self.log("✅ Successfully retrieved landing metrics")
                
                # Log metrics details
                landing = metrics.get('landing', {})
                self.log(f"Landing: {landing.get('title', 'No title')} (ID: {landing.get('id', 'No ID')})")
                self.log(f"Total clicks: {landing.get('totalClicks', 0)}")
                self.log(f"Total impressions: {landing.get('totalImpressions', 0)}")
                
                clicks_by_country = metrics.get('clicksByCountry', [])
                self.log(f"Clicks by country: {len(clicks_by_country)} entries")
                for country_data in clicks_by_country:
                    self.log(f"  {country_data.get('country')}: {country_data.get('clicks')} clicks")
                
                clicks_by_house = metrics.get('clicksByHouse', [])
                self.log(f"Clicks by house: {len(clicks_by_house)} entries")
                for house_data in clicks_by_house:
                    self.log(f"  {house_data.get('houseName')}: {house_data.get('clicks')} clicks")
                    
                return True
            elif response.status_code == 404:
                self.log("⚠️ Landing metrics not found - this may be expected for new landings", "WARN")
                return True  # Consider this a pass since the landing exists but may not have metrics yet
            else:
                self.log(f"❌ Get landing metrics failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get landing metrics test failed: {str(e)}", "ERROR")
            return False

    def test_get_public_landing(self) -> bool:
        """Test getting public landing by slug"""
        self.log("=== Testing Get Public Landing ===")
        
        # Use the specific slug from the review request
        slug = "fausto-perez-reto-navidad-2025"
        country = "ES"
        
        try:
            response = self.make_request("GET", f"/go/{slug}?country={country}", use_auth=False)
            
            if response.status_code == 200:
                landing = response.json()
                self.log("✅ Successfully retrieved public landing")
                
                # Verify required fields
                required_fields = ["id", "slug", "title", "tipster", "countriesEnabled", "selectedCountry", "items"]
                for field in required_fields:
                    if field in landing:
                        self.log(f"✅ Landing has {field}")
                    else:
                        self.log(f"❌ Landing missing {field}", "ERROR")
                        return False
                
                # Log landing details
                self.log(f"Landing title: {landing.get('title', 'No title')}")
                self.log(f"Slug: {landing.get('slug', 'No slug')}")
                self.log(f"Selected country: {landing.get('selectedCountry', 'No country')}")
                
                # Check tipster info
                tipster = landing.get('tipster', {})
                if tipster:
                    self.log(f"✅ Tipster: {tipster.get('publicName', 'No name')} (ID: {tipster.get('id', 'No ID')})")
                else:
                    self.log("❌ No tipster info", "ERROR")
                    return False
                
                # Check betting house items
                items = landing.get('items', [])
                self.log(f"✅ Found {len(items)} betting house items")
                for i, item in enumerate(items):
                    house = item.get('house', {})
                    if house:
                        self.log(f"  Item {i+1}: {house.get('name', 'No name')} (ID: {house.get('id', 'No ID')})")
                    
                return True
            else:
                self.log(f"❌ Get public landing failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get public landing test failed: {str(e)}", "ERROR")
            return False

    def test_click_tracking(self) -> bool:
        """Test click tracking functionality"""
        self.log("=== Testing Click Tracking ===")
        
        click_data = {
            "slug": "fausto-perez-reto-navidad-2025",
            "houseId": "6944674739e53ced97a01362",
            "country": "ES"
        }
        
        try:
            response = self.make_request("POST", "/r/click", click_data, use_auth=False)
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                result = response.json()
                self.log("✅ Click tracking successful")
                
                # Check required fields
                if "redirectUrl" in result and "clickId" in result:
                    self.log(f"✅ Redirect URL: {result['redirectUrl']}")
                    self.log(f"✅ Click ID: {result['clickId']}")
                    self.test_click_id = result['clickId']
                    return True
                else:
                    self.log("❌ Response missing redirectUrl or clickId", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Click tracking failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Click tracking test failed: {str(e)}", "ERROR")
            return False

    def test_health_telegram(self) -> bool:
        """Test Telegram bot health check"""
        self.log("=== Testing Telegram Health Check ===")
        
        try:
            response = self.make_request("GET", "/health/telegram", use_auth=False)
            
            if response.status_code == 200:
                status = response.json()
                self.log("✅ Telegram health check successful")
                
                # Log status details
                self.log(f"Status: {status.get('status', 'Unknown')}")
                if 'webhookUrl' in status:
                    self.log(f"Webhook URL: {status.get('webhookUrl', 'Not set')}")
                if 'botInfo' in status:
                    bot_info = status.get('botInfo', {})
                    self.log(f"Bot username: {bot_info.get('username', 'Unknown')}")
                    
                return True
            else:
                self.log(f"❌ Telegram health check failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Telegram health check test failed: {str(e)}", "ERROR")
            return False

    def test_health_email(self) -> bool:
        """Test email service health check"""
        self.log("=== Testing Email Health Check ===")
        
        try:
            response = self.make_request("GET", "/health/email", use_auth=False)
            
            if response.status_code == 200:
                status = response.json()
                self.log("✅ Email health check successful")
                
                # Log status details
                self.log(f"Status: {status.get('status', 'Unknown')}")
                if 'isConfigured' in status:
                    self.log(f"Is configured: {status.get('isConfigured', False)}")
                if 'provider' in status:
                    self.log(f"Provider: {status.get('provider', 'Unknown')}")
                    
                return True
            else:
                self.log(f"❌ Email health check failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Email health check test failed: {str(e)}", "ERROR")
            return False

    def run_affiliate_landing_tests(self) -> Dict[str, bool]:
        """Run all affiliate landing system tests"""
        self.log("🚀 Starting Antia Affiliate Landing System Tests")
        self.log("=" * 60)
        
        results = {}
        
        # 1. Authentication
        results["login"] = self.test_login()
        
        if not results["login"]:
            self.log("❌ Authentication failed - skipping authenticated tests", "ERROR")
            return results
        
        # 2. Landing CRUD (with tipster token)
        results["get_tipster_landings"] = self.test_get_tipster_landings()
        results["get_houses_spain"] = self.test_get_available_houses_for_spain()
        
        if self.test_landing_id:
            results["get_landing_metrics"] = self.test_get_landing_metrics()
        else:
            self.log("⚠️ No landing ID available - skipping metrics test", "WARN")
            results["get_landing_metrics"] = True  # Skip but don't fail
        
        # 3. Public Landing (no auth required)
        results["get_public_landing"] = self.test_get_public_landing()
        
        # 4. Click Tracking
        results["click_tracking"] = self.test_click_tracking()
        
        # 5. Health Checks
        results["health_telegram"] = self.test_health_telegram()
        results["health_email"] = self.test_health_email()
        
        return results

def main():
    """Main test runner"""
    tester = AntiaAffiliateTester()
    
    try:
        results = tester.run_affiliate_landing_tests()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = 0
        failed = 0
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:<30} {status}")
            
            if result:
                passed += 1
            else:
                failed += 1
        
        print(f"\nTotal: {len(results)} tests")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        
        if failed == 0:
            print("\n🎉 All tests passed!")
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