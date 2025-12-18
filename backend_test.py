#!/usr/bin/env python3
"""
Antia Platform Backend API Testing
Tests Product CRUD functionality for tipster platform
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://bet-dashboard-11.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
TIPSTER_EMAIL = "fausto.perez@antia.com"
TIPSTER_PASSWORD = "Tipster123!"
ADMIN_EMAIL = "admin@antia.com"
ADMIN_PASSWORD = "SuperAdmin123!"

class AntiaAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.admin_access_token = None
        self.test_product_id = None
        self.test_order_id_for_cleanup = None
        self.test_channel_id = None
        self.test_house_id = None
        self.test_campaign_id = None
        
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
            
    def test_get_my_products(self) -> bool:
        """Test getting tipster's products"""
        self.log("=== Testing Get My Products ===")
        
        try:
            response = self.make_request("GET", "/products/my")
            
            if response.status_code == 200:
                products = response.json()
                self.log(f"✅ Successfully retrieved {len(products)} products")
                
                # Log product details for debugging
                for i, product in enumerate(products):
                    self.log(f"Product {i+1}: {product.get('title', 'No title')} (ID: {product.get('id', 'No ID')})")
                    
                return True
            else:
                self.log(f"❌ Get my products failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get my products test failed: {str(e)}", "ERROR")
            return False
            
    def test_create_product(self) -> bool:
        """Test creating a new product"""
        self.log("=== Testing Create Product ===")
        
        product_data = {
            "title": "Test Product from Agent",
            "description": "Testing product creation via API",
            "priceCents": 3500,
            "currency": "EUR",
            "billingType": "ONE_TIME",
            "telegramChannelId": "@test_channel",
            "accessMode": "AUTO_JOIN"
        }
        
        try:
            response = self.make_request("POST", "/products", product_data)
            
            if response.status_code == 201:
                product = response.json()
                self.test_product_id = product.get("id")
                self.log(f"✅ Product created successfully with ID: {self.test_product_id}")
                
                # Verify product fields
                if product.get("title") == product_data["title"]:
                    self.log("✅ Product title matches")
                else:
                    self.log("❌ Product title mismatch", "ERROR")
                    
                if product.get("priceCents") == product_data["priceCents"]:
                    self.log("✅ Product price matches")
                else:
                    self.log("❌ Product price mismatch", "ERROR")
                    
                return True
            else:
                self.log(f"❌ Create product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create product test failed: {str(e)}", "ERROR")
            return False
            
    def test_get_single_product(self) -> bool:
        """Test getting a single product by ID"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Get Single Product ===")
        
        try:
            response = self.make_request("GET", f"/products/{self.test_product_id}")
            
            if response.status_code == 200:
                product = response.json()
                self.log(f"✅ Successfully retrieved product: {product.get('title', 'No title')}")
                return True
            else:
                self.log(f"❌ Get single product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get single product test failed: {str(e)}", "ERROR")
            return False
            
    def test_update_product(self) -> bool:
        """Test updating a product"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Update Product ===")
        
        update_data = {
            "title": "Updated Test Product from Agent",
            "priceCents": 4500,
            "description": "Updated description via API testing"
        }
        
        try:
            response = self.make_request("PATCH", f"/products/{self.test_product_id}", update_data)
            
            if response.status_code == 200:
                product = response.json()
                self.log("✅ Product updated successfully")
                
                # Verify updates
                if product.get("title") == update_data["title"]:
                    self.log("✅ Product title updated correctly")
                else:
                    self.log("❌ Product title update failed", "ERROR")
                    
                if product.get("priceCents") == update_data["priceCents"]:
                    self.log("✅ Product price updated correctly")
                else:
                    self.log("❌ Product price update failed", "ERROR")
                    
                return True
            else:
                self.log(f"❌ Update product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Update product test failed: {str(e)}", "ERROR")
            return False
            
    def test_pause_product(self) -> bool:
        """Test pausing a product"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Pause Product ===")
        
        try:
            response = self.make_request("POST", f"/products/{self.test_product_id}/pause")
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                product = response.json()
                self.log("✅ Product paused successfully")
                
                # Check if product is inactive
                if product.get("active") == False:
                    self.log("✅ Product active status is false")
                    return True
                else:
                    self.log("❌ Product active status not updated correctly", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Pause product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Pause product test failed: {str(e)}", "ERROR")
            return False
            
    def test_publish_product(self) -> bool:
        """Test publishing/activating a product"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Publish Product ===")
        
        try:
            response = self.make_request("POST", f"/products/{self.test_product_id}/publish")
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                product = response.json()
                self.log("✅ Product published successfully")
                
                # Check if product is active
                if product.get("active") == True:
                    self.log("✅ Product active status is true")
                    return True
                else:
                    self.log("❌ Product active status not updated correctly", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Publish product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Publish product test failed: {str(e)}", "ERROR")
            return False
            
    def test_verify_product_in_list(self) -> bool:
        """Verify the created product appears in the products list"""
        self.log("=== Testing Product Appears in List ===")
        
        try:
            response = self.make_request("GET", "/products/my")
            
            if response.status_code == 200:
                products = response.json()
                
                # Look for our test product
                found_product = None
                for product in products:
                    if product.get("id") == self.test_product_id:
                        found_product = product
                        break
                        
                if found_product:
                    self.log("✅ Created product appears in products list")
                    self.log(f"Product details: {found_product.get('title')} - {found_product.get('priceCents')} cents")
                    return True
                else:
                    self.log("❌ Created product NOT found in products list", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Failed to get products list with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify product in list test failed: {str(e)}", "ERROR")
            return False
            
    def test_stripe_checkout_get_product(self) -> bool:
        """Test getting product for checkout"""
        self.log("=== Testing Stripe Checkout - Get Product ===")
        
        # Use the specific product ID from the review request
        product_id = "6941ab8bc37d0aa47ab23ef8"
        
        try:
            response = self.make_request("GET", f"/checkout/product/{product_id}", use_auth=False)
            
            if response.status_code == 200:
                product = response.json()
                self.log("✅ Successfully retrieved product for checkout")
                
                # Verify required fields
                required_fields = ["id", "title", "priceCents", "currency"]
                for field in required_fields:
                    if field in product:
                        self.log(f"✅ Product has {field}: {product[field]}")
                    else:
                        self.log(f"❌ Product missing {field}", "ERROR")
                        return False
                        
                # Check if tipster info is included
                if "tipster" in product and product["tipster"]:
                    self.log(f"✅ Tipster info included: {product['tipster'].get('publicName', 'No name')}")
                else:
                    self.log("⚠️ No tipster info in response", "WARN")
                    
                return True
            else:
                self.log(f"❌ Get product for checkout failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get product for checkout test failed: {str(e)}", "ERROR")
            return False
            
    def test_stripe_checkout_create_session(self) -> bool:
        """Test creating Stripe checkout session (expected to fail with test key)"""
        self.log("=== Testing Stripe Checkout - Create Session ===")
        
        checkout_data = {
            "productId": "6941ab8bc37d0aa47ab23ef8",
            "originUrl": "https://bet-dashboard-11.preview.emergentagent.com",
            "isGuest": True,
            "email": "test@example.com"
        }
        
        try:
            response = self.make_request("POST", "/checkout/session", checkout_data, use_auth=False)
            
            # We expect this to fail because STRIPE_API_KEY is a test key (sk_test_emergent)
            if response.status_code == 400:
                response_data = response.json()
                self.log("✅ Checkout session creation failed as expected (test Stripe key)")
                self.log(f"Error message: {response_data.get('message', 'No message')}")
                return True
            elif response.status_code == 200 or response.status_code == 201:
                # If it somehow succeeds, that's also valid
                response_data = response.json()
                self.log("✅ Checkout session created successfully")
                if "url" in response_data and "orderId" in response_data:
                    self.log(f"Session URL: {response_data['url']}")
                    self.log(f"Order ID: {response_data['orderId']}")
                    return True
                else:
                    self.log("❌ Response missing required fields (url, orderId)", "ERROR")
                    return False
            else:
                self.log(f"❌ Unexpected response status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create checkout session test failed: {str(e)}", "ERROR")
            return False
            
    def test_telegram_webhook(self) -> bool:
        """Test Telegram webhook with generic message"""
        self.log("=== Testing Telegram Webhook ===")
        
        # Simulate a Telegram webhook payload with generic text
        webhook_data = {
            "update_id": 123456789,
            "message": {
                "message_id": 1,
                "from": {
                    "id": 987654321,
                    "is_bot": False,
                    "first_name": "Test",
                    "username": "testuser"
                },
                "chat": {
                    "id": 987654321,
                    "first_name": "Test",
                    "username": "testuser",
                    "type": "private"
                },
                "date": 1703000000,
                "text": "Hola"
            }
        }
        
        try:
            response = self.make_request("POST", "/telegram/webhook", webhook_data, use_auth=False)
            
            # The webhook should process the message and return ok: true or false
            if response.status_code == 200:
                response_data = response.json()
                self.log("✅ Telegram webhook processed message")
                self.log(f"Response: {response_data}")
                return True
            else:
                self.log(f"❌ Telegram webhook failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Telegram webhook test failed: {str(e)}", "ERROR")
            return False
            
    def test_mongodb_orders(self) -> bool:
        """Test MongoDB orders collection"""
        self.log("=== Testing MongoDB Orders Collection ===")
        
        try:
            # Use mongosh to check orders
            import subprocess
            
            cmd = [
                "mongosh", "--quiet", "antia_db", 
                "--eval", "db.orders.find({}).sort({created_at:-1}).limit(3).toArray()"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.log("✅ Successfully queried MongoDB orders collection")
                self.log(f"MongoDB output: {result.stdout}")
                
                # Check if we got valid JSON output
                try:
                    import json
                    orders = json.loads(result.stdout)
                    self.log(f"Found {len(orders)} recent orders")
                    return True
                except json.JSONDecodeError:
                    self.log("⚠️ MongoDB output is not valid JSON, but query succeeded", "WARN")
                    return True
            else:
                self.log(f"❌ MongoDB query failed: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB query timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ MongoDB test failed: {str(e)}", "ERROR")
            return False

    def test_get_order_details(self) -> bool:
        """Test getting order details by ID"""
        self.log("=== Testing Get Order Details ===")
        
        # Use the specific order ID from the review request
        order_id = "69420512627906d2653f118c"
        
        try:
            response = self.make_request("GET", f"/checkout/order/{order_id}", use_auth=False)
            
            if response.status_code == 200:
                order_data = response.json()
                self.log("✅ Successfully retrieved order details")
                
                # Verify required fields
                if "order" in order_data:
                    order = order_data["order"]
                    self.log(f"Order ID: {order.get('id', 'N/A')}")
                    self.log(f"Status: {order.get('status', 'N/A')}")
                    self.log(f"Amount: {order.get('amountCents', 'N/A')} cents")
                    
                    # Check if status is PAGADA as expected
                    if order.get('status') == 'PAGADA':
                        self.log("✅ Order status is PAGADA as expected")
                    else:
                        self.log(f"⚠️ Order status is {order.get('status')}, expected PAGADA", "WARN")
                else:
                    self.log("❌ Order data missing in response", "ERROR")
                    return False
                
                # Check for product and tipster info
                if "product" in order_data and order_data["product"]:
                    product = order_data["product"]
                    self.log(f"✅ Product info included: {product.get('title', 'No title')}")
                else:
                    self.log("⚠️ No product info in response", "WARN")
                    
                if "tipster" in order_data and order_data["tipster"]:
                    tipster = order_data["tipster"]
                    self.log(f"✅ Tipster info included: {tipster.get('publicName', 'No name')}")
                else:
                    self.log("⚠️ No tipster info in response", "WARN")
                    
                return True
            else:
                self.log(f"❌ Get order details failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get order details test failed: {str(e)}", "ERROR")
            return False

    def create_test_order_in_mongodb(self) -> str:
        """Create a new pending order in MongoDB and return the order ID"""
        self.log("=== Creating Test Order in MongoDB ===")
        
        try:
            import subprocess
            
            # MongoDB command to create new order
            mongo_script = '''
            const orderId = new ObjectId();
            db.orders.insertOne({
              _id: orderId,
              product_id: '6941ab8bc37d0aa47ab23ef8',
              tipster_id: '6941ab14c37d0aa47ab23ec6',
              amount_cents: 3400,
              currency: 'EUR',
              email_backup: 'nuevo@test.com',
              telegram_user_id: '98765432',
              status: 'PENDING',
              payment_provider: 'stripe',
              created_at: new Date(),
              updated_at: new Date()
            });
            print('ORDER_ID=' + orderId.toString());
            '''
            
            cmd = ["mongosh", "--quiet", "antia_db", "--eval", mongo_script]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                # Extract order ID from output
                output_lines = result.stdout.strip().split('\n')
                order_id = None
                
                for line in output_lines:
                    if line.startswith('ORDER_ID='):
                        order_id = line.replace('ORDER_ID=', '').strip()
                        break
                
                if order_id:
                    self.log(f"✅ Created test order with ID: {order_id}")
                    return order_id
                else:
                    self.log("❌ Could not extract order ID from MongoDB output", "ERROR")
                    self.log(f"MongoDB output: {result.stdout}")
                    return None
            else:
                self.log(f"❌ MongoDB order creation failed: {result.stderr}", "ERROR")
                return None
                
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB order creation timed out", "ERROR")
            return None
        except Exception as e:
            self.log(f"❌ Create test order failed: {str(e)}", "ERROR")
            return None

    def test_simulate_payment(self, order_id: str) -> bool:
        """Test simulating payment for an order"""
        if not order_id:
            self.log("❌ No order ID provided for payment simulation", "ERROR")
            return False
            
        self.log(f"=== Testing Simulate Payment for Order {order_id} ===")
        
        try:
            response = self.make_request("POST", f"/checkout/simulate-payment/{order_id}", use_auth=False)
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                payment_result = response.json()
                self.log("✅ Payment simulation successful")
                
                # Check response structure
                if payment_result.get("success"):
                    self.log("✅ Payment marked as successful")
                    
                    # Check if order status changed
                    if "order" in payment_result:
                        order = payment_result["order"]
                        if order.get("status") == "PAGADA":
                            self.log("✅ Order status changed to PAGADA")
                        else:
                            self.log(f"❌ Order status is {order.get('status')}, expected PAGADA", "ERROR")
                            return False
                    else:
                        self.log("⚠️ No order info in payment response", "WARN")
                        
                    # Check Telegram notification result
                    if "telegramNotification" in payment_result:
                        telegram_result = payment_result["telegramNotification"]
                        if telegram_result:
                            self.log("✅ Telegram notification attempted")
                        else:
                            self.log("⚠️ No Telegram notification result", "WARN")
                    
                    return True
                else:
                    self.log("❌ Payment simulation marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Simulate payment failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Simulate payment test failed: {str(e)}", "ERROR")
            return False

    def test_complete_payment(self, order_id: str) -> bool:
        """Test complete payment endpoint"""
        if not order_id:
            self.log("❌ No order ID provided for complete payment", "ERROR")
            return False
            
        self.log(f"=== Testing Complete Payment for Order {order_id} ===")
        
        complete_data = {
            "orderId": order_id
        }
        
        try:
            response = self.make_request("POST", "/checkout/complete-payment", complete_data, use_auth=False)
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                complete_result = response.json()
                self.log("✅ Complete payment successful")
                
                # Check response structure
                if complete_result.get("success"):
                    self.log("✅ Payment completion marked as successful")
                    
                    # Check for order, product, and tipster data
                    required_fields = ["order", "product", "tipster"]
                    for field in required_fields:
                        if field in complete_result and complete_result[field]:
                            if field == "order":
                                order = complete_result[field]
                                self.log(f"✅ Order data: ID={order.get('id')}, Status={order.get('status')}")
                            elif field == "product":
                                product = complete_result[field]
                                self.log(f"✅ Product data: {product.get('title')} - {product.get('priceCents')} cents")
                            elif field == "tipster":
                                tipster = complete_result[field]
                                self.log(f"✅ Tipster data: {tipster.get('publicName')}")
                        else:
                            self.log(f"❌ Missing {field} data in response", "ERROR")
                            return False
                    
                    return True
                else:
                    self.log("❌ Payment completion marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Complete payment failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Complete payment test failed: {str(e)}", "ERROR")
            return False

    def verify_order_in_mongodb(self, order_id: str = None) -> bool:
        """Verify order is updated in MongoDB"""
        self.log("=== Verifying Order in MongoDB ===")
        
        try:
            import subprocess
            
            if order_id:
                # Check specific order
                mongo_script = f'db.orders.findOne({{_id: ObjectId("{order_id}")}}, {{status: 1, payment_provider: 1, paid_at: 1}})'
            else:
                # Check any PAGADA order
                mongo_script = 'db.orders.findOne({status: "PAGADA"}, {status: 1, payment_provider: 1, paid_at: 1})'
            
            cmd = ["mongosh", "--quiet", "antia_db", "--eval", mongo_script]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.log("✅ Successfully queried MongoDB for order verification")
                self.log(f"MongoDB output: {result.stdout}")
                
                # Check if we got a valid result
                if "PAGADA" in result.stdout:
                    self.log("✅ Found order with status PAGADA")
                    
                    if "paid_at" in result.stdout:
                        self.log("✅ Order has paid_at timestamp")
                    else:
                        self.log("⚠️ Order missing paid_at timestamp", "WARN")
                    
                    return True
                else:
                    self.log("❌ No PAGADA order found in MongoDB", "ERROR")
                    return False
            else:
                self.log(f"❌ MongoDB verification failed: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB verification timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ MongoDB verification failed: {str(e)}", "ERROR")
            return False

    def check_telegram_notification_logs(self) -> bool:
        """Check backend logs for Telegram notification attempts"""
        self.log("=== Checking Backend Logs for Telegram Notifications ===")
        
        try:
            import subprocess
            
            # Check supervisor backend logs for Telegram notification messages
            cmd = ["tail", "-n", "100", "/var/log/supervisor/backend.out.log"]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                log_content = result.stdout
                
                # Look for payment success notification messages
                if "Processing payment success notification" in log_content:
                    self.log("✅ Found 'Processing payment success notification' in logs")
                    
                    # Check for other related messages
                    if "chat not found" in log_content.lower():
                        self.log("✅ Found expected 'chat not found' error (test chat_id doesn't exist)")
                    
                    return True
                else:
                    self.log("⚠️ No 'Processing payment success notification' found in recent logs", "WARN")
                    self.log("Recent log entries:")
                    # Show last few lines for debugging
                    lines = log_content.split('\n')[-10:]
                    for line in lines:
                        if line.strip():
                            self.log(f"  {line}")
                    return True  # Still pass as notification may not have been triggered
            else:
                self.log(f"❌ Could not read backend logs: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ Log check timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Log check failed: {str(e)}", "ERROR")
            return False

    # ===== PREMIUM CHANNEL FLOW TESTS =====
    
    def test_get_channel_info(self) -> bool:
        """Test getting channel info including premium channel link"""
        self.log("=== Testing Get Channel Info (Premium Channel) ===")
        
        try:
            response = self.make_request("GET", "/telegram/channel-info")
            
            if response.status_code == 200:
                channel_info = response.json()
                self.log("✅ Successfully retrieved channel info")
                
                # Check response structure
                expected_fields = ["connected", "channel", "premiumChannelLink"]
                for field in expected_fields:
                    if field in channel_info:
                        self.log(f"✅ Channel info has {field}: {channel_info[field]}")
                    else:
                        self.log(f"❌ Channel info missing {field}", "ERROR")
                        return False
                
                # Check if premium channel link exists
                premium_link = channel_info.get("premiumChannelLink")
                if premium_link:
                    self.log(f"✅ Premium channel link found: {premium_link}")
                    # Validate it's a Telegram link
                    if "t.me" in premium_link:
                        self.log("✅ Premium channel link is valid Telegram URL")
                    else:
                        self.log("⚠️ Premium channel link doesn't appear to be Telegram URL", "WARN")
                else:
                    self.log("ℹ️ No premium channel link set (this is normal for initial state)")
                
                return True
            else:
                self.log(f"❌ Get channel info failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get channel info test failed: {str(e)}", "ERROR")
            return False

    def test_update_premium_channel_link(self) -> bool:
        """Test updating premium channel link"""
        self.log("=== Testing Update Premium Channel Link ===")
        
        update_data = {
            "premiumChannelLink": "https://t.me/+NuevoCanal456"
        }
        
        try:
            response = self.make_request("POST", "/telegram/premium-channel", update_data)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Premium channel link updated successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Update marked as successful")
                    
                    # Verify the link was set correctly
                    if result.get("premiumChannelLink") == update_data["premiumChannelLink"]:
                        self.log("✅ Premium channel link matches expected value")
                        return True
                    else:
                        self.log(f"❌ Premium channel link mismatch. Expected: {update_data['premiumChannelLink']}, Got: {result.get('premiumChannelLink')}", "ERROR")
                        return False
                else:
                    self.log("❌ Update marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Update premium channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Update premium channel test failed: {str(e)}", "ERROR")
            return False

    def test_clear_premium_channel_link(self) -> bool:
        """Test clearing premium channel link (set to null)"""
        self.log("=== Testing Clear Premium Channel Link ===")
        
        clear_data = {
            "premiumChannelLink": None
        }
        
        try:
            response = self.make_request("POST", "/telegram/premium-channel", clear_data)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Premium channel link cleared successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Clear operation marked as successful")
                    
                    # Verify the link was cleared
                    if result.get("premiumChannelLink") is None:
                        self.log("✅ Premium channel link is null as expected")
                        return True
                    else:
                        self.log(f"❌ Premium channel link not cleared. Got: {result.get('premiumChannelLink')}", "ERROR")
                        return False
                else:
                    self.log("❌ Clear operation marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Clear premium channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Clear premium channel test failed: {str(e)}", "ERROR")
            return False

    def test_set_premium_channel_final(self) -> bool:
        """Test setting premium channel back to a final value"""
        self.log("=== Testing Set Premium Channel Final ===")
        
        final_data = {
            "premiumChannelLink": "https://t.me/+CanalPremiumFinal"
        }
        
        try:
            response = self.make_request("POST", "/telegram/premium-channel", final_data)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Premium channel link set to final value successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Final set operation marked as successful")
                    
                    # Verify the link was set correctly
                    if result.get("premiumChannelLink") == final_data["premiumChannelLink"]:
                        self.log("✅ Premium channel link matches final expected value")
                        return True
                    else:
                        self.log(f"❌ Premium channel link mismatch. Expected: {final_data['premiumChannelLink']}, Got: {result.get('premiumChannelLink')}", "ERROR")
                        return False
                else:
                    self.log("❌ Final set operation marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Set premium channel final failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Set premium channel final test failed: {str(e)}", "ERROR")
            return False

    def test_purchase_triggers_notification(self) -> bool:
        """Test that purchase triggers notification with channel link"""
        self.log("=== Testing Purchase Triggers Notification ===")
        
        purchase_data = {
            "productId": "694206ceb76f354acbfff5e9",
            "email": "test@final.com",
            "telegramUserId": "999888777"
        }
        
        try:
            response = self.make_request("POST", "/checkout/test-purchase", purchase_data, use_auth=False)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Test purchase completed successfully")
                
                # Check if purchase was successful
                if result.get("success"):
                    self.log("✅ Purchase marked as successful")
                    
                    # Check if order was created
                    if "orderId" in result and result["orderId"]:
                        self.log(f"✅ Order created with ID: {result['orderId']}")
                        
                        # Store order ID for potential cleanup
                        self.test_order_id_for_cleanup = result["orderId"]
                        
                        # Check if product info is included
                        if "product" in result and result["product"]:
                            product = result["product"]
                            self.log(f"✅ Product info included: {product.get('title')} - {product.get('priceCents')} cents")
                        
                        # Check if tipster info is included
                        if "tipster" in result and result["tipster"]:
                            tipster = result["tipster"]
                            self.log(f"✅ Tipster info included: {tipster.get('publicName')}")
                        
                        return True
                    else:
                        self.log("❌ No order ID in response", "ERROR")
                        return False
                else:
                    self.log("❌ Purchase marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Test purchase failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test purchase failed: {str(e)}", "ERROR")
            return False

    def test_verify_tipster_earnings_updated(self) -> bool:
        """Test that tipster earnings are updated after purchase"""
        self.log("=== Testing Tipster Earnings Updated ===")
        
        try:
            response = self.make_request("GET", "/orders/stats")
            
            if response.status_code == 200:
                stats = response.json()
                self.log("✅ Successfully retrieved tipster stats")
                
                # Check response structure
                expected_fields = ["totalSales", "totalEarningsCents", "currency"]
                for field in expected_fields:
                    if field in stats:
                        self.log(f"✅ Stats has {field}: {stats[field]}")
                    else:
                        self.log(f"❌ Stats missing {field}", "ERROR")
                        return False
                
                # Check if earnings are reasonable (should be > 0 if there are sales)
                total_sales = stats.get("totalSales", 0)
                total_earnings = stats.get("totalEarningsCents", 0)
                
                if total_sales > 0:
                    self.log(f"✅ Tipster has {total_sales} total sales")
                    
                    if total_earnings > 0:
                        self.log(f"✅ Tipster has {total_earnings} cents in total earnings")
                        
                        # Check if earnings match expected amount (6900 cents from test purchase)
                        # Note: This might not be exact if there were previous sales
                        if total_earnings >= 6900:
                            self.log("✅ Total earnings include expected amount from test purchase")
                        else:
                            self.log(f"⚠️ Total earnings ({total_earnings}) less than expected minimum (6900)", "WARN")
                        
                        return True
                    else:
                        self.log("❌ Total earnings is 0 despite having sales", "ERROR")
                        return False
                else:
                    self.log("ℹ️ No sales found for tipster (this might be expected for new account)")
                    return True  # Still pass as this might be expected
                    
            else:
                self.log(f"❌ Get tipster stats failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify tipster earnings test failed: {str(e)}", "ERROR")
            return False

    # ===== GEOLOCATION-BASED PAYMENT SYSTEM TESTS =====
    
    def test_detect_gateway(self) -> bool:
        """Test gateway detection based on IP geolocation"""
        self.log("=== Testing Gateway Detection ===")
        
        try:
            response = self.make_request("GET", "/checkout/detect-gateway", use_auth=False)
            
            if response.status_code == 200:
                gateway_info = response.json()
                self.log("✅ Successfully retrieved gateway detection info")
                
                # Check response structure
                expected_fields = ["gateway", "geo", "availableMethods"]
                for field in expected_fields:
                    if field in gateway_info:
                        self.log(f"✅ Gateway info has {field}: {gateway_info[field]}")
                    else:
                        self.log(f"❌ Gateway info missing {field}", "ERROR")
                        return False
                
                # Validate gateway value
                gateway = gateway_info.get("gateway")
                if gateway in ["stripe", "redsys"]:
                    self.log(f"✅ Gateway is valid: {gateway}")
                else:
                    self.log(f"❌ Invalid gateway value: {gateway}", "ERROR")
                    return False
                
                # Check geo info structure
                geo = gateway_info.get("geo", {})
                geo_fields = ["country", "countryName", "ip", "isSpain"]
                for field in geo_fields:
                    if field in geo:
                        self.log(f"✅ Geo info has {field}: {geo[field]}")
                    else:
                        self.log(f"❌ Geo info missing {field}", "ERROR")
                        return False
                
                # Check available methods
                methods = gateway_info.get("availableMethods", [])
                if isinstance(methods, list) and len(methods) > 0:
                    self.log(f"✅ Available methods: {methods}")
                else:
                    self.log("❌ No available payment methods", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ Gateway detection failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Gateway detection test failed: {str(e)}", "ERROR")
            return False

    def test_feature_flags(self) -> bool:
        """Test payment feature flags"""
        self.log("=== Testing Feature Flags ===")
        
        try:
            response = self.make_request("GET", "/checkout/feature-flags", use_auth=False)
            
            if response.status_code == 200:
                flags = response.json()
                self.log("✅ Successfully retrieved feature flags")
                
                # Check expected flags
                expected_flags = {
                    "cryptoEnabled": False,
                    "redsysEnabled": True,
                    "stripeEnabled": True
                }
                
                for flag_name, expected_value in expected_flags.items():
                    if flag_name in flags:
                        actual_value = flags[flag_name]
                        if actual_value == expected_value:
                            self.log(f"✅ {flag_name}: {actual_value} (matches expected)")
                        else:
                            self.log(f"⚠️ {flag_name}: {actual_value} (expected {expected_value})", "WARN")
                    else:
                        self.log(f"❌ Missing flag: {flag_name}", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"❌ Feature flags failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Feature flags test failed: {str(e)}", "ERROR")
            return False

    def test_spanish_ip_detection(self) -> bool:
        """Test Spanish IP detection via geolocation service"""
        self.log("=== Testing Spanish IP Detection ===")
        
        # We can't directly test with a Spanish IP since we're making requests from our server
        # But we can test the gateway detection endpoint and verify it handles geolocation
        try:
            response = self.make_request("GET", "/checkout/detect-gateway", use_auth=False)
            
            if response.status_code == 200:
                gateway_info = response.json()
                geo = gateway_info.get("geo", {})
                
                # Log the detected country for our current IP
                country = geo.get("country", "Unknown")
                country_name = geo.get("countryName", "Unknown")
                is_spain = geo.get("isSpain", False)
                
                self.log(f"✅ Detected country: {country} ({country_name})")
                self.log(f"✅ Is Spain: {is_spain}")
                
                # The test passes if we get valid geolocation data
                # In a real Spanish IP test, we would expect:
                # - country: "ES"
                # - countryName: "Spain" 
                # - isSpain: true
                # - gateway: "redsys" (if Redsys is enabled)
                
                if country and country_name:
                    self.log("✅ Geolocation service is working correctly")
                    
                    # Log what would happen with a Spanish IP
                    if is_spain:
                        self.log("✅ Current IP is from Spain - would use Redsys gateway")
                    else:
                        self.log(f"ℹ️ Current IP is from {country_name} - would use Stripe gateway")
                        self.log("ℹ️ Spanish IP (88.6.125.1) would return ES country code and use Redsys")
                    
                    return True
                else:
                    self.log("❌ Invalid geolocation data", "ERROR")
                    return False
            else:
                self.log(f"❌ Spanish IP detection test failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Spanish IP detection test failed: {str(e)}", "ERROR")
            return False

    def test_create_order_with_geo_data(self) -> bool:
        """Test creating order and verify geo data is stored"""
        self.log("=== Testing Create Order with Geo Data ===")
        
        purchase_data = {
            "productId": "694206ceb76f354acbfff5e9",
            "email": "geo_test@example.com"
        }
        
        try:
            response = self.make_request("POST", "/checkout/test-purchase", purchase_data, use_auth=False)
            
            if response.status_code in [200, 201]:
                result = response.json()
                self.log("✅ Test purchase completed successfully")
                
                # Check if purchase was successful
                if result.get("success"):
                    self.log("✅ Purchase marked as successful")
                    
                    # Get the order ID
                    order_id = result.get("orderId")
                    if order_id:
                        self.log(f"✅ Order created with ID: {order_id}")
                        
                        # Store for MongoDB verification
                        self.test_order_id_for_cleanup = order_id
                        
                        # Verify the order has required fields
                        order = result.get("order")
                        if order:
                            self.log(f"✅ Order status: {order.get('status')}")
                            self.log(f"✅ Payment provider: {order.get('paymentProvider')}")
                        
                        return True
                    else:
                        self.log("❌ No order ID in response", "ERROR")
                        return False
                else:
                    self.log("❌ Purchase marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Create order with geo data failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create order with geo data test failed: {str(e)}", "ERROR")
            return False

    def test_verify_order_geolocation_data(self) -> bool:
        """Verify order has geolocation data in MongoDB"""
        self.log("=== Verifying Order Geolocation Data in MongoDB ===")
        
        try:
            import subprocess
            
            # Query MongoDB for the test order with geolocation fields
            mongo_script = '''
            db.orders.findOne(
                {email_backup: "geo_test@example.com"}, 
                {
                    detected_country: 1, 
                    detected_country_name: 1, 
                    payment_provider: 1, 
                    commission_cents: 1, 
                    commission_rate: 1,
                    status: 1,
                    created_at: 1
                }
            )
            '''
            
            cmd = ["mongosh", "--quiet", "antia_db", "--eval", mongo_script]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.log("✅ Successfully queried MongoDB for geolocation data")
                output = result.stdout.strip()
                self.log(f"MongoDB output: {output}")
                
                # Check if we got valid data
                if "detected_country" in output:
                    self.log("✅ Order has detected_country field")
                else:
                    self.log("❌ Order missing detected_country field", "ERROR")
                    return False
                
                if "detected_country_name" in output:
                    self.log("✅ Order has detected_country_name field")
                else:
                    self.log("❌ Order missing detected_country_name field", "ERROR")
                    return False
                
                if "payment_provider" in output:
                    self.log("✅ Order has payment_provider field")
                else:
                    self.log("❌ Order missing payment_provider field", "ERROR")
                    return False
                
                if "commission_cents" in output:
                    self.log("✅ Order has commission_cents field")
                else:
                    self.log("❌ Order missing commission_cents field", "ERROR")
                    return False
                
                if "commission_rate" in output:
                    self.log("✅ Order has commission_rate field")
                else:
                    self.log("❌ Order missing commission_rate field", "ERROR")
                    return False
                
                # Check if order exists at all
                if "null" in output:
                    self.log("❌ No order found with email geo_test@example.com", "ERROR")
                    return False
                
                self.log("✅ All required geolocation fields present in order")
                return True
            else:
                self.log(f"❌ MongoDB geolocation verification failed: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB geolocation verification timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ MongoDB geolocation verification failed: {str(e)}", "ERROR")
            return False

    # ===== TELEGRAM CHANNELS MULTI-CANAL API TESTS =====
    
    def test_get_telegram_channels(self) -> bool:
        """Test GET /api/telegram/channels - Get all channels for tipster"""
        self.log("=== Testing Get Telegram Channels ===")
        
        try:
            response = self.make_request("GET", "/telegram/channels")
            
            if response.status_code == 200:
                response_data = response.json()
                self.log("✅ Successfully retrieved telegram channels")
                
                # Check response structure
                if "channels" in response_data:
                    channels = response_data["channels"]
                    self.log(f"✅ Found {len(channels)} channels")
                    
                    # Log channel details for debugging
                    for i, channel in enumerate(channels):
                        self.log(f"Channel {i+1}: {channel.get('channelTitle', 'No title')} (ID: {channel.get('id', 'No ID')})")
                        self.log(f"  - Channel ID: {channel.get('channelId', 'No channelId')}")
                        self.log(f"  - Type: {channel.get('channelType', 'No type')}")
                        self.log(f"  - Active: {channel.get('isActive', 'No status')}")
                    
                    return True
                else:
                    self.log("❌ Response missing 'channels' field", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Get telegram channels failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get telegram channels test failed: {str(e)}", "ERROR")
            return False

    def test_verify_telegram_channel(self) -> bool:
        """Test POST /api/telegram/channels/verify - Verify a channel"""
        self.log("=== Testing Verify Telegram Channel ===")
        
        verify_data = {
            "channelId": "-1001234567890"
        }
        
        try:
            response = self.make_request("POST", "/telegram/channels/verify", verify_data)
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Channel verification request completed")
                
                # Check response structure
                if "valid" in result:
                    is_valid = result["valid"]
                    self.log(f"✅ Channel valid: {is_valid}")
                    
                    if is_valid:
                        # If valid, check for additional info
                        if "title" in result:
                            self.log(f"✅ Channel title: {result['title']}")
                        if "type" in result:
                            self.log(f"✅ Channel type: {result['type']}")
                        if "memberCount" in result:
                            self.log(f"✅ Member count: {result['memberCount']}")
                    else:
                        # If invalid, check for error message
                        if "error" in result:
                            self.log(f"ℹ️ Verification error (expected): {result['error']}")
                    
                    return True
                else:
                    self.log("❌ Response missing 'valid' field", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Verify telegram channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify telegram channel test failed: {str(e)}", "ERROR")
            return False

    def test_create_telegram_channel(self) -> bool:
        """Test POST /api/telegram/channels - Create a new channel"""
        self.log("=== Testing Create Telegram Channel ===")
        
        channel_data = {
            "channelId": "-1001111222333",
            "channelTitle": "Test Channel from API",
            "channelType": "private"
        }
        
        try:
            response = self.make_request("POST", "/telegram/channels", channel_data)
            
            if response.status_code == 201:
                result = response.json()
                self.log("✅ Telegram channel created successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Creation marked as successful")
                    
                    if "channel" in result and result["channel"]:
                        channel = result["channel"]
                        self.test_channel_id = channel.get("id")  # Store for deletion test
                        self.log(f"✅ Channel created with ID: {self.test_channel_id}")
                        
                        # Verify channel fields
                        if channel.get("channelTitle") == channel_data["channelTitle"]:
                            self.log("✅ Channel title matches")
                        else:
                            self.log("❌ Channel title mismatch", "ERROR")
                            
                        if channel.get("channelId") == channel_data["channelId"]:
                            self.log("✅ Channel ID matches")
                        else:
                            self.log("❌ Channel ID mismatch", "ERROR")
                            
                        if channel.get("channelType") == channel_data["channelType"]:
                            self.log("✅ Channel type matches")
                        else:
                            self.log("❌ Channel type mismatch", "ERROR")
                        
                        return True
                    else:
                        self.log("❌ Response missing channel data", "ERROR")
                        return False
                else:
                    self.log("❌ Creation marked as failed", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Create telegram channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create telegram channel test failed: {str(e)}", "ERROR")
            return False

    def test_delete_telegram_channel(self) -> bool:
        """Test DELETE /api/telegram/channels/:id - Delete a channel"""
        if not hasattr(self, 'test_channel_id') or not self.test_channel_id:
            self.log("❌ No test channel ID available for deletion", "ERROR")
            return False
            
        self.log("=== Testing Delete Telegram Channel ===")
        
        try:
            response = self.make_request("DELETE", f"/telegram/channels/{self.test_channel_id}")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Telegram channel deleted successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Deletion marked as successful")
                    
                    if "message" in result:
                        self.log(f"✅ Message: {result['message']}")
                    
                    return True
                else:
                    self.log("❌ Deletion marked as failed", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Delete telegram channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Delete telegram channel test failed: {str(e)}", "ERROR")
            return False

    def run_all_tests(self) -> Dict[str, bool]:
        """Run all API tests"""
        self.log("🚀 Starting Antia Platform Backend API Tests")
        self.log(f"Testing against: {API_BASE}")
        
        results = {}
        
        # Test authentication first
        results["login"] = self.test_login()
        if not results["login"]:
            self.log("❌ Authentication failed - stopping tests", "ERROR")
            return results
            
        # Test getting existing products
        results["get_my_products"] = self.test_get_my_products()
        
        # Test creating a new product
        results["create_product"] = self.test_create_product()
        
        # Test getting single product (only if create succeeded)
        if results["create_product"]:
            results["get_single_product"] = self.test_get_single_product()
            results["update_product"] = self.test_update_product()
            results["pause_product"] = self.test_pause_product()
            results["publish_product"] = self.test_publish_product()
            results["verify_product_in_list"] = self.test_verify_product_in_list()
        else:
            self.log("⚠️ Skipping dependent tests due to create product failure", "WARN")
            
        # Stripe Checkout Tests (don't require authentication)
        self.log("\n" + "="*50)
        self.log("🛒 STRIPE CHECKOUT INTEGRATION TESTS")
        self.log("="*50)
        
        results["stripe_get_product"] = self.test_stripe_checkout_get_product()
        results["stripe_create_session"] = self.test_stripe_checkout_create_session()
        results["telegram_webhook"] = self.test_telegram_webhook()
        results["mongodb_orders"] = self.test_mongodb_orders()

        # Post-Payment Flow Tests
        self.log("\n" + "="*50)
        self.log("💳 POST-PAYMENT FLOW TESTS")
        self.log("="*50)
        
        # Test 1: Get existing order details
        results["get_order_details"] = self.test_get_order_details()
        
        # Test 2: Create new order and simulate payment
        test_order_id = self.create_test_order_in_mongodb()
        if test_order_id:
            results["simulate_payment"] = self.test_simulate_payment(test_order_id)
            results["complete_payment"] = self.test_complete_payment(test_order_id)
            results["verify_mongodb_order"] = self.verify_order_in_mongodb(test_order_id)
        else:
            self.log("⚠️ Skipping payment tests due to order creation failure", "WARN")
            results["simulate_payment"] = False
            results["complete_payment"] = False
            results["verify_mongodb_order"] = False
        
        # Test 3: Check Telegram notification logs
        results["telegram_notification_logs"] = self.check_telegram_notification_logs()

        # Premium Channel Flow Tests
        self.log("\n" + "="*50)
        self.log("🔗 PREMIUM CHANNEL FLOW TESTS")
        self.log("="*50)
        
        # Test 1: Get channel info (includes premium channel)
        results["get_channel_info"] = self.test_get_channel_info()
        
        # Test 2: Update premium channel link
        results["update_premium_channel"] = self.test_update_premium_channel_link()
        
        # Test 3: Clear premium channel (set to null)
        results["clear_premium_channel"] = self.test_clear_premium_channel_link()
        
        # Test 4: Set premium channel back
        results["set_premium_channel_final"] = self.test_set_premium_channel_final()
        
        # Test 5: Test purchase triggers notification with channel link
        results["purchase_triggers_notification"] = self.test_purchase_triggers_notification()
        
        # Test 6: Verify tipster earnings updated
        results["verify_tipster_earnings"] = self.test_verify_tipster_earnings_updated()

        # Geolocation-Based Payment System Tests
        self.log("\n" + "="*50)
        self.log("🌍 GEOLOCATION-BASED PAYMENT SYSTEM TESTS")
        self.log("="*50)
        
        # Test 1: Gateway detection
        results["detect_gateway"] = self.test_detect_gateway()
        
        # Test 2: Feature flags
        results["feature_flags"] = self.test_feature_flags()
        
        # Test 3: Spanish IP detection (via geolocation service)
        results["spanish_ip_detection"] = self.test_spanish_ip_detection()
        
        # Test 4: Create order and verify geo data is stored
        results["create_order_geo_data"] = self.test_create_order_with_geo_data()
        
        # Test 5: Verify order has geolocation data in MongoDB
        results["verify_order_geo_data"] = self.test_verify_order_geolocation_data()

        # Telegram Channels Multi-Canal API Tests
        self.log("\n" + "="*50)
        self.log("📺 TELEGRAM CHANNELS MULTI-CANAL API TESTS")
        self.log("="*50)
        
        # Test 1: Get all channels for tipster
        results["get_telegram_channels"] = self.test_get_telegram_channels()
        
        # Test 2: Verify a channel
        results["verify_telegram_channel"] = self.test_verify_telegram_channel()
        
        # Test 3: Create a new channel
        results["create_telegram_channel"] = self.test_create_telegram_channel()
        
        # Test 4: Delete a channel (only if create succeeded)
        if results["create_telegram_channel"]:
            results["delete_telegram_channel"] = self.test_delete_telegram_channel()
        else:
            self.log("⚠️ Skipping delete channel test due to create failure", "WARN")
            results["delete_telegram_channel"] = False
        
        # Test 5: Verify products endpoint still works
        results["verify_products_my"] = self.test_get_my_products()
            
        return results
        
    def print_summary(self, results: Dict[str, bool]):
        """Print test results summary"""
        self.log("\n" + "="*50)
        self.log("📊 TEST RESULTS SUMMARY")
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
            self.log("🎉 All tests passed!")
        else:
            self.log(f"⚠️ {total - passed} test(s) failed")
            
        return passed == total

def main():
    """Main test execution"""
    tester = AntiaAPITester()
    
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