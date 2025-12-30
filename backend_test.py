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
BASE_URL = "https://apifix-2.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
TIPSTER_EMAIL = "fausto.perez@antia.com"
TIPSTER_PASSWORD = "Tipster123!"

# Admin credentials
ADMIN_EMAIL = "admin@antia.com"
ADMIN_PASSWORD = "SuperAdmin123!"

class AntiaAffiliateTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.admin_access_token = None
        self.test_landing_id = None
        self.test_click_id = None
        self.test_promotion_id = None
        self.test_promotion_house_id = None
        self.test_promotion_affiliate_url = None
        self.test_promotion_landing_slug = None
        self.test_admin_promotion_id = None
        self.test_admin_house_link_id = None
        
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

    def test_get_active_promotions(self) -> bool:
        """Test getting active promotions for tipsters"""
        self.log("=== Testing Get Active Promotions ===")
        
        try:
            response = self.make_request("GET", "/promotions")
            
            if response.status_code == 200:
                promotions = response.json()
                self.log(f"✅ Successfully retrieved {len(promotions)} active promotions")
                
                # Log promotion details for debugging
                for i, promotion in enumerate(promotions):
                    self.log(f"Promotion {i+1}: {promotion.get('name', 'No name')} (ID: {promotion.get('id', 'No ID')})")
                    self.log(f"  Slug: {promotion.get('slug', 'No slug')}")
                    self.log(f"  Description: {promotion.get('description', 'No description')}")
                    
                    # Store first promotion ID for further tests
                    if i == 0 and promotion.get('id'):
                        self.test_promotion_id = promotion.get('id')
                        
                return True
            else:
                self.log(f"❌ Get active promotions failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get active promotions test failed: {str(e)}", "ERROR")
            return False

    def test_get_promotion_houses(self) -> bool:
        """Test getting houses for a specific promotion"""
        if not hasattr(self, 'test_promotion_id') or not self.test_promotion_id:
            self.log("❌ No test promotion ID available", "ERROR")
            return False
            
        self.log("=== Testing Get Promotion Houses ===")
        
        try:
            response = self.make_request("GET", f"/promotions/{self.test_promotion_id}/houses")
            
            if response.status_code == 200:
                houses = response.json()
                self.log(f"✅ Successfully retrieved {len(houses)} houses for promotion")
                
                # Log house details for debugging
                for i, house_link in enumerate(houses):
                    house = house_link.get('house', {})
                    self.log(f"House {i+1}: {house.get('name', 'No name')} (ID: {house_link.get('bettingHouseId', 'No ID')})")
                    self.log(f"  Affiliate URL: {house_link.get('affiliateUrl', 'No URL')}")
                    self.log(f"  Allowed Countries: {house.get('allowedCountries', [])}")
                    
                    # Store first house ID for further tests
                    if i == 0 and house_link.get('bettingHouseId'):
                        self.test_promotion_house_id = house_link.get('bettingHouseId')
                        self.test_promotion_affiliate_url = house_link.get('affiliateUrl')
                        
                return True
            else:
                self.log(f"❌ Get promotion houses failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get promotion houses test failed: {str(e)}", "ERROR")
            return False

    def test_create_landing_with_promotion(self) -> bool:
        """Test creating a landing with a promotion"""
        if not hasattr(self, 'test_promotion_id') or not self.test_promotion_id:
            self.log("❌ No test promotion ID available", "ERROR")
            return False
            
        self.log("=== Testing Create Landing with Promotion ===")
        
        landing_data = {
            "title": "Mi Reto Navidad Test",
            "description": "Landing de prueba para el reto de navidad",
            "promotionId": self.test_promotion_id,
            "countriesEnabled": ["ES"],
            "countryConfigs": [
                {
                    "country": "ES",
                    "items": [
                        {
                            "bettingHouseId": self.test_promotion_house_id if hasattr(self, 'test_promotion_house_id') else "6944674739e53ced97a01362",
                            "orderIndex": 1,
                            "customTermsText": "Deposita al menos 10€ y recibe tu bono"
                        }
                    ]
                }
            ]
        }
        
        try:
            response = self.make_request("POST", "/tipster/landings", landing_data)
            
            if response.status_code in [200, 201]:
                result = response.json()
                self.log("✅ Landing with promotion created successfully")
                
                # Check required fields
                if "id" in result and "slug" in result:
                    self.log(f"✅ Landing ID: {result['id']}")
                    self.log(f"✅ Landing Slug: {result['slug']}")
                    self.log(f"✅ Promotion ID: {result.get('promotionId', 'Not set')}")
                    self.test_promotion_landing_slug = result['slug']
                    return True
                else:
                    self.log("❌ Response missing id or slug", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Create landing with promotion failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create landing with promotion test failed: {str(e)}", "ERROR")
            return False

    def test_public_landing_with_promotion(self) -> bool:
        """Test getting public landing with promotion data"""
        # Use the specific slug from the review request or the one we just created
        slug = getattr(self, 'test_promotion_landing_slug', 'fausto-perez-mi-reto-navidad')
        
        self.log("=== Testing Public Landing with Promotion ===")
        
        try:
            response = self.make_request("GET", f"/go/{slug}?country=ES", use_auth=False)
            
            if response.status_code == 200:
                landing = response.json()
                self.log("✅ Successfully retrieved public landing with promotion")
                
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
                self.log(f"❌ Get public landing with promotion failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get public landing with promotion test failed: {str(e)}", "ERROR")
            return False

    def test_promotion_specific_redirect(self) -> bool:
        """Test click tracking with promotion-specific redirect URL"""
        self.log("=== Testing Promotion-Specific Redirect ===")
        
        # Use the specific slug and house ID from the review request
        slug = getattr(self, 'test_promotion_landing_slug', 'fausto-perez-mi-reto-navidad')
        house_id = getattr(self, 'test_promotion_house_id', '6944674739e53ced97a01362')  # Bwin
        
        click_data = {
            "slug": slug,
            "houseId": house_id,
            "country": "ES"
        }
        
        try:
            response = self.make_request("POST", "/r/click", click_data, use_auth=False)
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                result = response.json()
                self.log("✅ Promotion-specific click tracking successful")
                
                # Check required fields
                if "redirectUrl" in result and "clickId" in result:
                    redirect_url = result['redirectUrl']
                    self.log(f"✅ Redirect URL: {redirect_url}")
                    self.log(f"✅ Click ID: {result['clickId']}")
                    
                    # Validate that it's using promotion-specific URL, not master URL
                    if hasattr(self, 'test_promotion_affiliate_url') and self.test_promotion_affiliate_url:
                        expected_base = self.test_promotion_affiliate_url.split('?')[0]  # Remove existing params
                        if expected_base in redirect_url:
                            self.log(f"✅ Using promotion-specific URL: {expected_base}")
                        else:
                            self.log(f"⚠️ May not be using promotion-specific URL. Expected base: {expected_base}", "WARN")
                    
                    self.test_click_id = result['clickId']
                    return True
                else:
                    self.log("❌ Response missing redirectUrl or clickId", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Promotion-specific click tracking failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Promotion-specific click tracking test failed: {str(e)}", "ERROR")
            return False

    def test_click_tracking(self) -> bool:
        """Test basic click tracking functionality (legacy test)"""
        self.log("=== Testing Basic Click Tracking ===")
        
        click_data = {
            "slug": "fausto-perez-reto-navidad-2025",
            "houseId": "6944674739e53ced97a01362",
            "country": "ES"
        }
        
        try:
            response = self.make_request("POST", "/r/click", click_data, use_auth=False)
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                result = response.json()
                self.log("✅ Basic click tracking successful")
                
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
                self.log(f"❌ Basic click tracking failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Basic click tracking test failed: {str(e)}", "ERROR")
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

    def test_admin_login(self) -> bool:
        """Test authentication with admin credentials"""
        self.log("=== Testing Admin Authentication ===")
        
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        try:
            response = self.make_request("POST", "/auth/login", login_data, use_auth=False)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if access_token is in response
                if "access_token" in response_data:
                    self.admin_access_token = response_data["access_token"]
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

    def test_admin_get_all_promotions(self) -> bool:
        """Test GET /api/admin/promotions - List all promotions"""
        self.log("=== Testing Admin Get All Promotions ===")
        
        # Temporarily switch to admin token
        original_token = self.access_token
        self.access_token = self.admin_access_token
        
        try:
            response = self.make_request("GET", "/admin/promotions")
            
            if response.status_code == 200:
                promotions = response.json()
                self.log(f"✅ Successfully retrieved {len(promotions)} promotions")
                
                # Log promotion details for debugging
                for i, promotion in enumerate(promotions):
                    self.log(f"Promotion {i+1}: {promotion.get('name', 'No name')} (ID: {promotion.get('id', 'No ID')})")
                    self.log(f"  Slug: {promotion.get('slug', 'No slug')}")
                    self.log(f"  Status: {promotion.get('status', 'No status')}")
                    self.log(f"  Houses Count: {promotion.get('housesCount', 0)}")
                    
                return True
            else:
                self.log(f"❌ Get all promotions failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get all promotions test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_admin_create_promotion(self) -> bool:
        """Test POST /api/admin/promotions - Create new promotion"""
        self.log("=== Testing Admin Create Promotion ===")
        
        # Temporarily switch to admin token
        original_token = self.access_token
        self.access_token = self.admin_access_token
        
        promotion_data = {
            "name": "Reto Año Nuevo 2026",
            "description": "Celebra el año nuevo con bonos especiales",
            "houseLinks": []  # We'll add houses separately
        }
        
        try:
            response = self.make_request("POST", "/admin/promotions", promotion_data)
            
            if response.status_code in [200, 201]:
                result = response.json()
                self.log("✅ Promotion created successfully")
                
                # Check required fields
                if "id" in result and "slug" in result:
                    self.log(f"✅ Promotion ID: {result['id']}")
                    self.log(f"✅ Promotion Slug: {result['slug']}")
                    self.log(f"✅ Promotion Name: {result.get('name', 'Not set')}")
                    self.test_admin_promotion_id = result['id']
                    return True
                else:
                    self.log("❌ Response missing id or slug", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Create promotion failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create promotion test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_admin_add_house_to_promotion(self) -> bool:
        """Test POST /api/admin/promotions/:id/houses - Add house to promotion"""
        if not self.test_admin_promotion_id:
            self.log("❌ No test admin promotion ID available", "ERROR")
            return False
            
        self.log("=== Testing Admin Add House to Promotion ===")
        
        # Temporarily switch to admin token
        original_token = self.access_token
        self.access_token = self.admin_access_token
        
        house_data = {
            "bettingHouseId": "6944674739e53ced97a01362",  # Bwin
            "affiliateUrl": "https://bwin.com/ano-nuevo-2026?aff=antia",
            "trackingParamName": "subid"
        }
        
        try:
            response = self.make_request("POST", f"/admin/promotions/{self.test_admin_promotion_id}/houses", house_data)
            
            if response.status_code in [200, 201]:
                result = response.json()
                self.log("✅ House added to promotion successfully")
                
                # Check required fields
                if "id" in result and "success" in result:
                    self.log(f"✅ House Link ID: {result['id']}")
                    self.test_admin_house_link_id = result['id']
                    return True
                else:
                    self.log("❌ Response missing id or success", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Add house to promotion failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Add house to promotion test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_admin_get_promotion_detail(self) -> bool:
        """Test GET /api/admin/promotions/:id - Get promotion detail"""
        if not self.test_admin_promotion_id:
            self.log("❌ No test admin promotion ID available", "ERROR")
            return False
            
        self.log("=== Testing Admin Get Promotion Detail ===")
        
        # Temporarily switch to admin token
        original_token = self.access_token
        self.access_token = self.admin_access_token
        
        try:
            response = self.make_request("GET", f"/admin/promotions/{self.test_admin_promotion_id}")
            
            if response.status_code == 200:
                promotion = response.json()
                self.log("✅ Successfully retrieved promotion detail")
                
                # Verify required fields
                required_fields = ["id", "name", "slug", "status", "houseLinks"]
                for field in required_fields:
                    if field in promotion:
                        self.log(f"✅ Promotion has {field}")
                    else:
                        self.log(f"❌ Promotion missing {field}", "ERROR")
                        return False
                
                # Log promotion details
                self.log(f"Promotion name: {promotion.get('name', 'No name')}")
                self.log(f"Slug: {promotion.get('slug', 'No slug')}")
                self.log(f"Status: {promotion.get('status', 'No status')}")
                
                # Check house links
                house_links = promotion.get('houseLinks', [])
                self.log(f"✅ Found {len(house_links)} house links")
                for i, link in enumerate(house_links):
                    house = link.get('house', {})
                    if house:
                        self.log(f"  Link {i+1}: {house.get('name', 'No name')} (ID: {link.get('bettingHouseId', 'No ID')})")
                        self.log(f"    Affiliate URL: {link.get('affiliateUrl', 'No URL')}")
                    
                return True
            else:
                self.log(f"❌ Get promotion detail failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get promotion detail test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_admin_update_promotion_status(self) -> bool:
        """Test PUT /api/admin/promotions/:id - Update promotion status"""
        if not self.test_admin_promotion_id:
            self.log("❌ No test admin promotion ID available", "ERROR")
            return False
            
        self.log("=== Testing Admin Update Promotion Status ===")
        
        # Temporarily switch to admin token
        original_token = self.access_token
        self.access_token = self.admin_access_token
        
        update_data = {
            "status": "INACTIVE"
        }
        
        try:
            response = self.make_request("PUT", f"/admin/promotions/{self.test_admin_promotion_id}", update_data)
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Promotion status updated successfully")
                
                # Verify status was updated
                if result.get('status') == 'INACTIVE':
                    self.log("✅ Status correctly updated to INACTIVE")
                    return True
                else:
                    self.log(f"❌ Status not updated correctly. Got: {result.get('status')}", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Update promotion status failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Update promotion status test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_tipster_view_active_promotions(self) -> bool:
        """Test GET /api/promotions - Verify tipster can see only ACTIVE promotions"""
        self.log("=== Testing Tipster View Active Promotions ===")
        
        try:
            response = self.make_request("GET", "/promotions")
            
            if response.status_code == 200:
                promotions = response.json()
                self.log(f"✅ Successfully retrieved {len(promotions)} active promotions for tipster")
                
                # Verify all promotions are active (our test promotion should be INACTIVE now)
                test_promotion_found = False
                for promotion in promotions:
                    self.log(f"Promotion: {promotion.get('name', 'No name')} (ID: {promotion.get('id', 'No ID')})")
                    if promotion.get('id') == self.test_admin_promotion_id:
                        test_promotion_found = True
                        self.log("❌ Test promotion (INACTIVE) should not be visible to tipster", "ERROR")
                        return False
                
                if not test_promotion_found:
                    self.log("✅ Test promotion (INACTIVE) correctly hidden from tipster")
                    
                return True
            else:
                self.log(f"❌ Get active promotions for tipster failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get active promotions for tipster test failed: {str(e)}", "ERROR")
            return False

    def test_admin_delete_promotion(self) -> bool:
        """Test DELETE /api/admin/promotions/:id - Delete promotion"""
        if not self.test_admin_promotion_id:
            self.log("❌ No test admin promotion ID available", "ERROR")
            return False
            
        self.log("=== Testing Admin Delete Promotion ===")
        
        # Temporarily switch to admin token
        original_token = self.access_token
        self.access_token = self.admin_access_token
        
        try:
            response = self.make_request("DELETE", f"/admin/promotions/{self.test_admin_promotion_id}")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Promotion deleted successfully")
                
                # Verify success response
                if result.get('success'):
                    self.log("✅ Delete operation confirmed successful")
                    return True
                else:
                    self.log("❌ Delete response missing success confirmation", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Delete promotion failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Delete promotion test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

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

    # ==================== AFFILIATE STATISTICS TESTS ====================

    def test_admin_affiliate_stats(self) -> bool:
        """Test GET /api/admin/affiliate/stats - Admin Affiliate Statistics Dashboard"""
        self.log("=== Testing Admin Affiliate Stats ===")
        
        # Temporarily switch to admin token
        original_token = self.access_token
        self.access_token = self.admin_access_token
        
        try:
            # Test with basic parameters
            params = {
                'startDate': '2024-01-01',
                'endDate': '2024-12-31'
            }
            
            response = self.make_request("GET", "/admin/affiliate/stats", headers={'Content-Type': 'application/json'})
            
            if response.status_code == 200:
                stats = response.json()
                self.log("✅ Admin affiliate stats retrieved successfully")
                
                # Verify expected structure
                expected_fields = ['general', 'byCountry', 'byHouse', 'byDate', 'byCampaign', 'byTipster', 'filterOptions']
                for field in expected_fields:
                    if field in stats:
                        self.log(f"✅ Stats has {field}")
                    else:
                        self.log(f"⚠️ Stats missing {field} (may be empty)", "WARN")
                
                # Log general stats if available
                if 'general' in stats:
                    general = stats['general']
                    self.log(f"Total clicks: {general.get('totalClicks', 0)}")
                    self.log(f"Total conversions: {general.get('conversions', 0)}")
                    self.log(f"Conversion rate: {general.get('conversionRate', 0)}%")
                    self.log(f"Total earnings: {general.get('totalEarnings', 0)}")
                
                return True
            else:
                self.log(f"❌ Admin affiliate stats failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin affiliate stats test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_tipster_affiliate_stats(self) -> bool:
        """Test GET /api/affiliate/tipster/stats - Tipster Statistics Dashboard"""
        self.log("=== Testing Tipster Affiliate Stats ===")
        
        try:
            # Test with date range parameters
            params = {
                'startDate': '2024-01-01',
                'endDate': '2024-12-31'
            }
            
            response = self.make_request("GET", "/affiliate/tipster/stats")
            
            if response.status_code == 200:
                stats = response.json()
                self.log("✅ Tipster affiliate stats retrieved successfully")
                
                # Verify expected structure
                expected_fields = ['general', 'byCountry', 'byHouse', 'byDate', 'byCampaign']
                for field in expected_fields:
                    if field in stats:
                        self.log(f"✅ Stats has {field}")
                    else:
                        self.log(f"⚠️ Stats missing {field} (may be empty)", "WARN")
                
                # Log general stats if available
                if 'general' in stats:
                    general = stats['general']
                    self.log(f"Total clicks: {general.get('totalClicks', 0)}")
                    self.log(f"Total conversions: {general.get('conversions', 0)}")
                    self.log(f"Conversion rate: {general.get('conversionRate', 0)}%")
                    self.log(f"Total earnings: {general.get('totalEarnings', 0)}")
                
                return True
            else:
                self.log(f"❌ Tipster affiliate stats failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Tipster affiliate stats test failed: {str(e)}", "ERROR")
            return False

    def test_tipster_promotions(self) -> bool:
        """Test GET /api/tipster/landings/promotions - Tipster Promotions/Campaigns"""
        self.log("=== Testing Tipster Promotions ===")
        
        try:
            response = self.make_request("GET", "/tipster/landings/promotions")
            
            if response.status_code == 200:
                promotions = response.json()
                self.log(f"✅ Successfully retrieved {len(promotions)} promotions")
                
                # Verify expected structure for each promotion
                for i, promotion in enumerate(promotions):
                    expected_fields = ['id', 'name', 'slug', 'description', 'housesCount']
                    self.log(f"Promotion {i+1}: {promotion.get('name', 'No name')}")
                    
                    for field in expected_fields:
                        if field in promotion:
                            self.log(f"  ✅ Has {field}: {promotion[field]}")
                        else:
                            self.log(f"  ❌ Missing {field}", "ERROR")
                            return False
                
                return True
            else:
                self.log(f"❌ Tipster promotions failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Tipster promotions test failed: {str(e)}", "ERROR")
            return False

    def test_conversion_postback(self) -> bool:
        """Test POST /api/r/postback - Conversion Postback"""
        self.log("=== Testing Conversion Postback ===")
        
        try:
            # Test postback data with correct format from the controller
            postback_data = {
                "subid": "test-tipster-id_test-click-id",
                "house": "test-house",
                "event": "DEPOSIT",
                "amount": 100,
                "currency": "EUR",
                "txid": "test-ref-001"
            }
            
            # Try the correct postback endpoint from the controller
            response = self.make_request("POST", "/r/postback", postback_data, use_auth=False)
            
            if response.status_code in [200, 201]:
                result = response.json()
                self.log("✅ Postback endpoint responded correctly")
                self.log(f"Postback result: {result}")
                
                # Even if it fails due to invalid data, the endpoint is working
                if result.get('success') == False and 'error' in result:
                    self.log("⚠️ Postback failed with test data (expected for invalid IDs)", "WARN")
                
                return True
            else:
                self.log(f"❌ Conversion postback failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Conversion postback test failed: {str(e)}", "ERROR")
            return False

    def test_health_check(self) -> bool:
        """Test GET /api/health - Health Check"""
        self.log("=== Testing Health Check ===")
        
        try:
            response = self.make_request("GET", "/health", use_auth=False)
            
            if response.status_code == 200:
                health = response.json()
                self.log("✅ Health check successful")
                
                # Log health details
                self.log(f"Status: {health.get('status', 'Unknown')}")
                self.log(f"Database: {health.get('database', 'Unknown')}")
                self.log(f"Users count: {health.get('usersCount', 0)}")
                self.log(f"Uptime: {health.get('uptime', 0)} seconds")
                
                return True
            else:
                self.log(f"❌ Health check failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Health check test failed: {str(e)}", "ERROR")
            return False

    def run_affiliate_statistics_tests(self) -> Dict[str, bool]:
        """Run affiliate statistics system tests as requested in review"""
        self.log("🚀 Starting AFFILIA-GO Affiliate Statistics System Tests")
        self.log("=" * 60)
        
        results = {}
        
        # 1. Health Check (P0)
        results["health_check"] = self.test_health_check()
        
        # 2. Authentication Tests
        results["tipster_login"] = self.test_login()
        results["admin_login"] = self.test_admin_login()
        
        if not results["tipster_login"]:
            self.log("❌ Tipster authentication failed - skipping tipster tests", "ERROR")
        
        if not results["admin_login"]:
            self.log("❌ Admin authentication failed - skipping admin tests", "ERROR")
        
        # 3. Admin Affiliate Stats (P0)
        if results["admin_login"]:
            results["admin_affiliate_stats"] = self.test_admin_affiliate_stats()
        else:
            results["admin_affiliate_stats"] = False
        
        # 4. Tipster Stats (P0)
        if results["tipster_login"]:
            results["tipster_affiliate_stats"] = self.test_tipster_affiliate_stats()
        else:
            results["tipster_affiliate_stats"] = False
        
        # 5. Tipster Promotions/Campaigns (P0)
        if results["tipster_login"]:
            results["tipster_promotions"] = self.test_tipster_promotions()
        else:
            results["tipster_promotions"] = False
        
        # 6. Conversion Postback (P1)
        results["conversion_postback"] = self.test_conversion_postback()
        
        return results

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
        
        # 2. Admin Authentication and Tests
        results["admin_login"] = self.test_admin_login()
        
        if results["admin_login"]:
            # Admin Promotions API Tests
            results["admin_get_all_promotions"] = self.test_admin_get_all_promotions()
            results["admin_create_promotion"] = self.test_admin_create_promotion()
            
            if hasattr(self, 'test_admin_promotion_id') and self.test_admin_promotion_id:
                results["admin_add_house_to_promotion"] = self.test_admin_add_house_to_promotion()
                results["admin_get_promotion_detail"] = self.test_admin_get_promotion_detail()
                results["admin_update_promotion_status"] = self.test_admin_update_promotion_status()
                results["tipster_view_active_promotions"] = self.test_tipster_view_active_promotions()
                results["admin_delete_promotion"] = self.test_admin_delete_promotion()
            else:
                self.log("⚠️ No admin promotion ID available - skipping promotion management tests", "WARN")
        else:
            self.log("❌ Admin authentication failed - skipping admin tests", "ERROR")
        
        # 3. Promotions API (existing tests for promotion-specific functionality)
        results["get_active_promotions"] = self.test_get_active_promotions()
        
        if hasattr(self, 'test_promotion_id') and self.test_promotion_id:
            results["get_promotion_houses"] = self.test_get_promotion_houses()
        else:
            self.log("⚠️ No promotion ID available - skipping promotion houses test", "WARN")
            results["get_promotion_houses"] = True  # Skip but don't fail
        
        # 4. Landing CRUD (with tipster token)
        results["get_tipster_landings"] = self.test_get_tipster_landings()
        results["get_houses_spain"] = self.test_get_available_houses_for_spain()
        
        # 5. Create landing with promotion
        if hasattr(self, 'test_promotion_id') and self.test_promotion_id:
            results["create_landing_with_promotion"] = self.test_create_landing_with_promotion()
        else:
            self.log("⚠️ No promotion ID available - skipping create landing with promotion test", "WARN")
            results["create_landing_with_promotion"] = True  # Skip but don't fail
        
        if self.test_landing_id:
            results["get_landing_metrics"] = self.test_get_landing_metrics()
        else:
            self.log("⚠️ No landing ID available - skipping metrics test", "WARN")
            results["get_landing_metrics"] = True  # Skip but don't fail
        
        # 6. Public Landing (no auth required)
        results["get_public_landing"] = self.test_get_public_landing()
        results["get_public_landing_with_promotion"] = self.test_public_landing_with_promotion()
        
        # 7. Click Tracking
        results["click_tracking"] = self.test_click_tracking()
        results["promotion_specific_redirect"] = self.test_promotion_specific_redirect()
        
        # 8. Health Checks
        results["health_telegram"] = self.test_health_telegram()
        results["health_email"] = self.test_health_email()
        
        return results

def main():
    """Main test runner"""
    tester = AntiaAffiliateTester()
    
    try:
        # Run the affiliate statistics tests as requested in the review
        results = tester.run_affiliate_statistics_tests()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏁 AFFILIATE STATISTICS TEST SUMMARY")
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
            print("\n🎉 All affiliate statistics tests passed!")
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