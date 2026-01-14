#!/usr/bin/env python3
"""
AFFILIA-GO Platform Telegram Bot API Testing
Tests Telegram Bot integration for the platform
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://sale-analytics.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
TIPSTER_EMAIL = "fausto.perez@antia.com"
TIPSTER_PASSWORD = "Tipster123!"

class TelegramBotTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, use_auth: bool = True, timeout: int = 10) -> requests.Response:
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
                timeout=timeout
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

    def test_telegram_bot_status(self) -> bool:
        """Test Telegram bot status endpoint (P0)"""
        self.log("=== Testing Telegram Bot Status (P0) ===")
        
        try:
            response = self.make_request("GET", "/telegram/status", use_auth=False, timeout=60)
            
            if response.status_code == 200:
                status = response.json()
                self.log("✅ Telegram bot status endpoint successful")
                
                # Check required fields from review request
                required_fields = {
                    'initialized': True,
                    'botUsername': 'Antiabetbot',
                    'webhookConfigured': True,
                    'proxyMode': True,
                    'lastError': None
                }
                
                all_good = True
                for field, expected_value in required_fields.items():
                    actual_value = status.get(field)
                    if field == 'lastError':
                        # lastError should be None or null
                        if actual_value is not None:
                            self.log(f"⚠️ {field}: expected None, got {actual_value}", "WARN")
                            all_good = False
                        else:
                            self.log(f"✅ {field}: {actual_value}")
                    elif field == 'botUsername':
                        # Check if bot username matches expected
                        if actual_value != expected_value:
                            self.log(f"⚠️ {field}: expected {expected_value}, got {actual_value}", "WARN")
                            all_good = False
                        else:
                            self.log(f"✅ {field}: {actual_value}")
                    else:
                        # Check boolean fields
                        if actual_value != expected_value:
                            self.log(f"⚠️ {field}: expected {expected_value}, got {actual_value}", "WARN")
                            all_good = False
                        else:
                            self.log(f"✅ {field}: {actual_value}")
                
                # Log all status details
                for key, value in status.items():
                    if key not in required_fields:
                        self.log(f"Additional field {key}: {value}")
                
                return all_good
            else:
                self.log(f"❌ Telegram bot status failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Telegram bot status test failed: {str(e)}", "ERROR")
            return False

    def test_health_check(self) -> bool:
        """Test main health check endpoint (P0)"""
        self.log("=== Testing Health Check (P0) ===")
        
        try:
            response = self.make_request("GET", "/health", use_auth=False)
            
            if response.status_code == 200:
                health = response.json()
                self.log("✅ Health check successful")
                
                # Check that status is "ok"
                if health.get('status') == 'ok':
                    self.log("✅ Health status: ok")
                else:
                    self.log(f"❌ Health status: {health.get('status')}", "ERROR")
                    return False
                
                # Log additional health info
                for key, value in health.items():
                    if key != 'status':
                        self.log(f"Health info {key}: {value}")
                
                return True
            else:
                self.log(f"❌ Health check failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Health check test failed: {str(e)}", "ERROR")
            return False

    def test_telegram_channel_info_with_auth(self) -> bool:
        """Test Telegram channel info endpoint with authentication"""
        self.log("=== Testing Telegram Channel Info (with auth) ===")
        
        try:
            response = self.make_request("GET", "/telegram/channel-info")
            
            if response.status_code == 200:
                channel_info = response.json()
                self.log("✅ Telegram channel info successful")
                
                # Log channel connection status
                self.log(f"Connected: {channel_info.get('connected', False)}")
                self.log(f"Channel: {channel_info.get('channel', 'None')}")
                self.log(f"Premium Channel Link: {channel_info.get('premiumChannelLink', 'None')}")
                
                return True
            else:
                self.log(f"❌ Telegram channel info failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Telegram channel info test failed: {str(e)}", "ERROR")
            return False

    def test_telegram_webhook_endpoint(self) -> bool:
        """Test Telegram webhook endpoint"""
        self.log("=== Testing Telegram Webhook Endpoint ===")
        
        try:
            # Test with empty body as specified in review request
            response = self.make_request("POST", "/telegram/webhook", {}, use_auth=False, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Telegram webhook endpoint successful")
                
                # Should return { ok: true } or { ok: false } (not error)
                if 'ok' in result:
                    self.log(f"✅ Webhook response: ok = {result['ok']}")
                    return True
                else:
                    self.log(f"⚠️ Webhook response missing 'ok' field: {result}", "WARN")
                    return True  # Still consider it a pass if no error
                    
            else:
                self.log(f"❌ Telegram webhook failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Telegram webhook test failed: {str(e)}", "ERROR")
            return False

    def run_telegram_tests(self) -> Dict[str, bool]:
        """Run all Telegram bot tests"""
        self.log("🚀 Starting AFFILIA-GO Telegram Bot Tests")
        self.log("=" * 60)
        
        results = {}
        
        # P0 Tests - Critical
        results["health_check"] = self.test_health_check()
        results["telegram_bot_status"] = self.test_telegram_bot_status()
        results["telegram_webhook"] = self.test_telegram_webhook_endpoint()
        
        # Authentication Test
        results["login"] = self.test_login()
        
        # Authenticated Tests
        if results["login"]:
            results["telegram_channel_info"] = self.test_telegram_channel_info_with_auth()
        else:
            self.log("❌ Authentication failed - skipping authenticated tests", "ERROR")
            results["telegram_channel_info"] = False
        
        return results

def main():
    """Main test runner"""
    tester = TelegramBotTester()
    
    try:
        results = tester.run_telegram_tests()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏁 TELEGRAM BOT TEST SUMMARY")
        print("=" * 60)
        
        passed = 0
        failed = 0
        
        # Group by priority
        p0_tests = ["health_check", "telegram_bot_status", "telegram_webhook"]
        auth_tests = ["login"]
        other_tests = ["telegram_channel_info"]
        
        print("\n🔴 P0 CRITICAL TESTS:")
        for test_name in p0_tests:
            if test_name in results:
                result = results[test_name]
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"  {test_name:<30} {status}")
                if result:
                    passed += 1
                else:
                    failed += 1
        
        print("\n🔐 AUTHENTICATION TESTS:")
        for test_name in auth_tests:
            if test_name in results:
                result = results[test_name]
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"  {test_name:<30} {status}")
                if result:
                    passed += 1
                else:
                    failed += 1
        
        print("\n📱 TELEGRAM FEATURE TESTS:")
        for test_name in other_tests:
            if test_name in results:
                result = results[test_name]
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"  {test_name:<30} {status}")
                if result:
                    passed += 1
                else:
                    failed += 1
        
        print(f"\nTotal: {len(results)} tests")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        
        # Check P0 tests specifically
        p0_failed = sum(1 for test in p0_tests if test in results and not results[test])
        
        if p0_failed > 0:
            print(f"\n💥 {p0_failed} P0 CRITICAL test(s) failed!")
            print("🚨 Telegram bot integration has critical issues!")
            sys.exit(1)
        elif failed == 0:
            print("\n🎉 All tests passed!")
            print("✅ Telegram bot integration is working correctly!")
            sys.exit(0)
        else:
            print(f"\n⚠️ {failed} non-critical test(s) failed")
            print("✅ P0 tests passed - core functionality working")
            sys.exit(0)
            
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test runner failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()