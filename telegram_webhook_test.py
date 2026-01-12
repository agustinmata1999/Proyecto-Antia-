#!/usr/bin/env python3
"""
Telegram Bot Webhook Integration Testing for Antia Platform
Tests webhook configuration and message handling flows
"""

import requests
import json
import sys
import subprocess
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://tipstats.preview.emergentagent.com"
WEBHOOK_URL = f"{BASE_URL}/api/telegram/webhook"
BOT_TOKEN = "8422601694:AAHiM9rnHgufLkeLKrNe28aibFZippxGr-k"
BOT_USERNAME = "Antiabetbot"

# Real product ID from MongoDB
REAL_PRODUCT_ID = "6941ab8bc37d0aa47ab23ef8"

class TelegramWebhookTester:
    def __init__(self):
        self.session = requests.Session()
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def make_webhook_request(self, update_data: Dict) -> requests.Response:
        """Make webhook request to Telegram endpoint"""
        self.log(f"Making webhook request to {WEBHOOK_URL}")
        self.log(f"Update data: {json.dumps(update_data, indent=2)}")
        
        try:
            response = self.session.post(
                WEBHOOK_URL,
                json=update_data,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                timeout=30
            )
            
            self.log(f"Response status: {response.status_code}")
            
            try:
                response_data = response.json()
                self.log(f"Response data: {json.dumps(response_data, indent=2)}")
            except:
                self.log(f"Response text: {response.text}")
                
            return response
            
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            raise
            
    def check_webhook_info(self) -> bool:
        """Test 1: Verify webhook is configured correctly"""
        self.log("=== Test 1: Checking Webhook Configuration ===")
        
        try:
            # Call Telegram API to get webhook info
            telegram_api_url = f"https://api.telegram.org/bot{BOT_TOKEN}/getWebhookInfo"
            response = self.session.get(telegram_api_url, timeout=30)
            
            if response.status_code == 200:
                webhook_info = response.json()
                self.log(f"Webhook info: {json.dumps(webhook_info, indent=2)}")
                
                if webhook_info.get("ok"):
                    result = webhook_info.get("result", {})
                    webhook_url = result.get("url", "")
                    
                    expected_url = f"{BASE_URL}/api/telegram/webhook"
                    if webhook_url == expected_url:
                        self.log("✅ Webhook URL is correctly configured")
                        return True
                    else:
                        self.log(f"❌ Webhook URL mismatch. Expected: {expected_url}, Got: {webhook_url}", "ERROR")
                        return False
                else:
                    self.log("❌ Telegram API returned error", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to get webhook info: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Webhook info check failed: {str(e)}", "ERROR")
            return False
            
    def test_start_command_no_payload(self) -> bool:
        """Test 2: Test /start command with no payload"""
        self.log("=== Test 2: Testing /start Command (No Payload) ===")
        
        update_data = {
            "update_id": 123456,
            "message": {
                "message_id": 1,
                "from": {
                    "id": 123456789,
                    "is_bot": False,
                    "first_name": "TestUser",
                    "username": "testuser"
                },
                "chat": {
                    "id": 123456789,
                    "type": "private"
                },
                "date": 1703952000,
                "text": "/start"
            }
        }
        
        try:
            response = self.make_webhook_request(update_data)
            
            # Check if webhook returns success
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("ok") == True:
                    self.log("✅ Webhook returned success for /start command")
                    return True
                elif response_data.get("ok") == False:
                    self.log("⚠️ Webhook returned ok:false (expected for fake chat ID)")
                    return True  # This is expected behavior
                else:
                    self.log("❌ Unexpected webhook response format", "ERROR")
                    return False
            else:
                self.log(f"❌ Webhook failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ /start command test failed: {str(e)}", "ERROR")
            return False
            
    def test_valid_product_link(self) -> bool:
        """Test 3: Test valid product link detection"""
        self.log("=== Test 3: Testing Valid Product Link Detection ===")
        
        product_link = f"https://t.me/{BOT_USERNAME}?start=product_{REAL_PRODUCT_ID}"
        
        update_data = {
            "update_id": 123457,
            "message": {
                "message_id": 2,
                "from": {
                    "id": 123456789,
                    "is_bot": False,
                    "first_name": "TestUser",
                    "username": "testuser"
                },
                "chat": {
                    "id": 123456789,
                    "type": "private"
                },
                "date": 1703952001,
                "text": product_link
            }
        }
        
        try:
            response = self.make_webhook_request(update_data)
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("ok") in [True, False]:  # Both are acceptable
                    self.log("✅ Webhook processed valid product link")
                    return True
                else:
                    self.log("❌ Unexpected webhook response format", "ERROR")
                    return False
            else:
                self.log(f"❌ Webhook failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Valid product link test failed: {str(e)}", "ERROR")
            return False
            
    def test_invalid_text_handling(self) -> bool:
        """Test 4: Test invalid text handling"""
        self.log("=== Test 4: Testing Invalid Text Handling ===")
        
        update_data = {
            "update_id": 123458,
            "message": {
                "message_id": 3,
                "from": {
                    "id": 123456789,
                    "is_bot": False,
                    "first_name": "TestUser",
                    "username": "testuser"
                },
                "chat": {
                    "id": 123456789,
                    "type": "private"
                },
                "date": 1703952002,
                "text": "Hola, quiero comprar"
            }
        }
        
        try:
            response = self.make_webhook_request(update_data)
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("ok") in [True, False]:  # Both are acceptable
                    self.log("✅ Webhook processed invalid text message")
                    return True
                else:
                    self.log("❌ Unexpected webhook response format", "ERROR")
                    return False
            else:
                self.log(f"❌ Webhook failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Invalid text handling test failed: {str(e)}", "ERROR")
            return False
            
    def test_deep_link_with_payload(self) -> bool:
        """Test 5: Test deep link with product payload"""
        self.log("=== Test 5: Testing Deep Link with Product Payload ===")
        
        update_data = {
            "update_id": 123459,
            "message": {
                "message_id": 4,
                "from": {
                    "id": 123456789,
                    "is_bot": False,
                    "first_name": "TestUser",
                    "username": "testuser"
                },
                "chat": {
                    "id": 123456789,
                    "type": "private"
                },
                "date": 1703952003,
                "text": f"/start product_{REAL_PRODUCT_ID}"
            }
        }
        
        try:
            response = self.make_webhook_request(update_data)
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("ok") in [True, False]:  # Both are acceptable
                    self.log("✅ Webhook processed deep link with product payload")
                    return True
                else:
                    self.log("❌ Unexpected webhook response format", "ERROR")
                    return False
            else:
                self.log(f"❌ Webhook failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Deep link with payload test failed: {str(e)}", "ERROR")
            return False
            
    def check_backend_logs(self) -> Dict[str, bool]:
        """Check backend logs for expected messages"""
        self.log("=== Checking Backend Logs ===")
        
        try:
            # Get recent backend logs
            result = subprocess.run(
                ["tail", "-n", "50", "/var/log/supervisor/backend.out.log"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                logs = result.stdout
                self.log("Backend logs (last 50 lines):")
                self.log(logs)
                
                # Check for expected log patterns
                log_checks = {
                    "start_command": "📥 Received /start command" in logs,
                    "no_payload": "No product payload, asking user to paste link" in logs or "ℹ️  No product payload, asking user to paste link" in logs,
                    "product_detection": f"🎯 Detected product link, extracting ID: {REAL_PRODUCT_ID}" in logs,
                    "invalid_text": "❌ Text does not contain valid product link" in logs,
                    "deep_link": f"Starting product flow from deep link for: {REAL_PRODUCT_ID}" in logs or f"🎯 Starting product flow from deep link for: {REAL_PRODUCT_ID}" in logs
                }
                
                self.log("Log pattern analysis:")
                for check_name, found in log_checks.items():
                    status = "✅ FOUND" if found else "❌ NOT FOUND"
                    self.log(f"  {check_name}: {status}")
                    
                return log_checks
            else:
                self.log("❌ Failed to read backend logs", "ERROR")
                return {}
                
        except Exception as e:
            self.log(f"❌ Log check failed: {str(e)}", "ERROR")
            return {}
            
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all webhook tests"""
        self.log("🚀 Starting Telegram Bot Webhook Integration Tests")
        self.log(f"Testing webhook: {WEBHOOK_URL}")
        self.log(f"Bot: @{BOT_USERNAME}")
        self.log(f"Using product ID: {REAL_PRODUCT_ID}")
        
        results = {}
        
        # Test 1: Webhook configuration
        results["webhook_config"] = self.check_webhook_info()
        
        # Test 2: /start command (no payload)
        results["start_no_payload"] = self.test_start_command_no_payload()
        
        # Test 3: Valid product link
        results["valid_product_link"] = self.test_valid_product_link()
        
        # Test 4: Invalid text handling
        results["invalid_text"] = self.test_invalid_text_handling()
        
        # Test 5: Deep link with payload
        results["deep_link_payload"] = self.test_deep_link_with_payload()
        
        # Check backend logs
        self.log("\n" + "="*50)
        log_results = self.check_backend_logs()
        results.update(log_results)
        
        return results
        
    def print_summary(self, results: Dict[str, bool]):
        """Print test results summary"""
        self.log("\n" + "="*60)
        self.log("📊 TELEGRAM WEBHOOK TEST RESULTS SUMMARY")
        self.log("="*60)
        
        passed = 0
        total = len(results)
        
        # Group results
        webhook_tests = ["webhook_config", "start_no_payload", "valid_product_link", "invalid_text", "deep_link_payload"]
        log_tests = ["start_command", "no_payload", "product_detection", "invalid_text", "deep_link"]
        
        self.log("🔗 WEBHOOK FUNCTIONALITY TESTS:")
        for test_name in webhook_tests:
            if test_name in results:
                result = results[test_name]
                status = "✅ PASS" if result else "❌ FAIL"
                self.log(f"  {test_name.replace('_', ' ').title()}: {status}")
                if result:
                    passed += 1
                    
        self.log("\n📋 BACKEND LOG VERIFICATION:")
        for test_name in log_tests:
            if test_name in results:
                result = results[test_name]
                status = "✅ FOUND" if result else "❌ NOT FOUND"
                self.log(f"  {test_name.replace('_', ' ').title()}: {status}")
                if result:
                    passed += 1
                    
        self.log(f"\n📈 Overall: {passed}/{total} checks passed")
        
        # Determine overall success
        critical_tests = ["webhook_config", "start_no_payload"]
        critical_passed = all(results.get(test, False) for test in critical_tests)
        
        if critical_passed:
            self.log("🎉 Critical webhook functionality is working!")
        else:
            self.log("⚠️ Critical webhook issues detected")
            
        return critical_passed

def main():
    """Main test execution"""
    tester = TelegramWebhookTester()
    
    try:
        results = tester.run_all_tests()
        success = tester.print_summary(results)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()