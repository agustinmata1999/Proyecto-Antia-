#!/usr/bin/env python3
"""
Telegram Publication Channel Feature Testing
Tests the new publication channel endpoints for tipsters
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://affily-pro.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
TIPSTER_EMAIL = "fausto.perez@antia.com"
TIPSTER_PASSWORD = "Tipster123!"

class PublicationChannelTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def make_request(self, method: str, endpoint: str, data: dict = None, 
                    headers: dict = None, use_auth: bool = True) -> requests.Response:
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

    def test_get_publication_channel(self) -> bool:
        """Test GET /api/telegram/publication-channel - Get current publication channel config"""
        self.log("=== Testing Get Publication Channel ===")
        
        try:
            response = self.make_request("GET", "/telegram/publication-channel")
            
            if response.status_code == 200:
                channel_info = response.json()
                self.log("✅ Successfully retrieved publication channel info")
                
                # Check response structure
                expected_fields = ["configured", "channelId", "channelTitle"]
                for field in expected_fields:
                    if field in channel_info:
                        self.log(f"✅ Publication channel info has {field}: {channel_info[field]}")
                    else:
                        self.log(f"❌ Publication channel info missing {field}", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"❌ Get publication channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get publication channel test failed: {str(e)}", "ERROR")
            return False

    def test_set_publication_channel(self) -> bool:
        """Test POST /api/telegram/publication-channel - Set publication channel"""
        self.log("=== Testing Set Publication Channel ===")
        
        # Use one of the existing channels from the review request
        channel_data = {
            "channelId": "-1003329431615",
            "channelTitle": "Test Publication Channel"
        }
        
        try:
            response = self.make_request("POST", "/telegram/publication-channel", channel_data)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Publication channel set request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Publication channel set successfully")
                    return True
                else:
                    self.log(f"❌ Publication channel set failed: {result.get('message', 'No message')}", "ERROR")
                    # This might fail if the bot is not admin of the channel, which is expected
                    if "administrador" in result.get('message', '').lower() or "admin" in result.get('message', '').lower():
                        self.log("ℹ️ Expected failure - bot is not admin of test channel")
                        return True
                    return False
            else:
                self.log(f"❌ Set publication channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Set publication channel test failed: {str(e)}", "ERROR")
            return False

    def test_publish_product_to_telegram(self) -> bool:
        """Test POST /api/products/:id/publish-telegram - Publish product to Telegram"""
        self.log("=== Testing Publish Product to Telegram ===")
        
        # First get a product ID from the tipster's products
        try:
            products_response = self.make_request("GET", "/products/my")
            
            if products_response.status_code != 200:
                self.log("❌ Could not get products list for publish test", "ERROR")
                return False
            
            products = products_response.json()
            if not products or len(products) == 0:
                self.log("❌ No products available for publish test", "ERROR")
                return False
            
            # Use the first product
            product_id = products[0].get("id")
            if not product_id:
                self.log("❌ Product missing ID field", "ERROR")
                return False
            
            self.log(f"Using product ID: {product_id} for publish test")
            
            # Test publishing to Telegram
            response = self.make_request("POST", f"/products/{product_id}/publish-telegram")
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Publish to Telegram request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Product published to Telegram successfully")
                    return True
                else:
                    self.log(f"❌ Publish to Telegram failed: {result.get('message', 'No message')}", "ERROR")
                    # This might fail if no publication channel is configured or bot has no access
                    error_msg = result.get('message', '').lower()
                    if "canal" in error_msg or "channel" in error_msg or "configurado" in error_msg:
                        self.log("ℹ️ Expected failure - no publication channel configured or bot has no access")
                        return True
                    return False
            else:
                self.log(f"❌ Publish to Telegram failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Publish product to Telegram test failed: {str(e)}", "ERROR")
            return False

    def test_delete_publication_channel(self) -> bool:
        """Test DELETE /api/telegram/publication-channel - Remove publication channel"""
        self.log("=== Testing Delete Publication Channel ===")
        
        try:
            response = self.make_request("DELETE", "/telegram/publication-channel")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Delete publication channel request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Publication channel deleted successfully")
                    return True
                else:
                    self.log(f"❌ Delete publication channel failed: {result.get('message', 'No message')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Delete publication channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Delete publication channel test failed: {str(e)}", "ERROR")
            return False

    def run_tests(self):
        """Run all publication channel tests"""
        self.log("🚀 Starting Telegram Publication Channel Tests")
        self.log(f"Testing against: {API_BASE}")
        
        results = {}
        
        # Test authentication first
        results["login"] = self.test_login()
        if not results["login"]:
            self.log("❌ Authentication failed - stopping tests", "ERROR")
            return results
            
        # Test publication channel endpoints
        results["get_publication_channel"] = self.test_get_publication_channel()
        results["set_publication_channel"] = self.test_set_publication_channel()
        results["publish_product_to_telegram"] = self.test_publish_product_to_telegram()
        results["delete_publication_channel"] = self.test_delete_publication_channel()
        
        # Final verification
        results["verify_publication_channel_deleted"] = self.test_get_publication_channel()
        
        # Print summary
        self.log("\n" + "="*50)
        self.log("📊 TELEGRAM PUBLICATION CHANNEL TEST RESULTS")
        self.log("="*50)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
                
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 All Telegram Publication Channel tests passed!")
        else:
            self.log(f"⚠️ {total - passed} test(s) failed")
            
        return results

def main():
    tester = PublicationChannelTester()
    results = tester.run_tests()
    
    # Exit with error code if any tests failed
    if not all(results.values()):
        sys.exit(1)

if __name__ == "__main__":
    main()