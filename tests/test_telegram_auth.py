"""
Test suite for Telegram Auth endpoints
Tests the new automated Telegram channel connection feature:
- GET /api/telegram/auth/status - Auth status with isConnected field
- GET /api/telegram/auth/bot-info - Bot configuration
- POST /api/telegram/auth/connect-with-code - Code validation
- POST /api/telegram/auth/auto-connect-channel - Channel auto-connect
- GET /api/telegram/channels - List connected channels
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://campaign-manager-48.preview.emergentagent.com')

# Test credentials
TIPSTER_EMAIL = "fausto.perez@antia.com"
TIPSTER_PASSWORD = "Tipster123!"


class TestTelegramAuthPublicEndpoints:
    """Test public Telegram auth endpoints (no authentication required)"""
    
    def test_bot_info_returns_200(self):
        """GET /api/telegram/auth/bot-info should return bot configuration"""
        response = requests.get(f"{BASE_URL}/api/telegram/auth/bot-info")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "configured" in data, "Response should have 'configured' field"
        
        if data["configured"]:
            assert "botUsername" in data, "Configured bot should have 'botUsername'"
            print(f"✅ Bot info: configured={data['configured']}, username={data.get('botUsername')}")
        else:
            print(f"✅ Bot info: configured={data['configured']}, message={data.get('message')}")


class TestTelegramAuthProtectedEndpoints:
    """Test protected Telegram auth endpoints (authentication required)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tipster"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TIPSTER_EMAIL,
            "password": TIPSTER_PASSWORD
        })
        
        if response.status_code != 200 and response.status_code != 201:
            pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
        
        data = response.json()
        token = data.get("access_token") or data.get("token")
        
        if not token:
            pytest.skip(f"No token in response: {data}")
        
        print(f"✅ Authenticated as {TIPSTER_EMAIL}")
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_auth_status_returns_isConnected_field(self, auth_headers):
        """GET /api/telegram/auth/status should return auth status with isConnected field"""
        response = requests.get(
            f"{BASE_URL}/api/telegram/auth/status",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "isConnected" in data, "Response should have 'isConnected' field"
        assert isinstance(data["isConnected"], bool), "'isConnected' should be a boolean"
        
        print(f"✅ Auth status: isConnected={data['isConnected']}")
        
        if data["isConnected"]:
            # If connected, should have additional fields
            assert "telegramId" in data or "telegramUsername" in data, \
                "Connected status should include telegramId or telegramUsername"
            print(f"   telegramId={data.get('telegramId')}, username={data.get('telegramUsername')}")
    
    def test_auth_status_without_token_returns_401(self):
        """GET /api/telegram/auth/status without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/telegram/auth/status")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Auth status correctly requires authentication")
    
    def test_connect_with_invalid_code_returns_400(self, auth_headers):
        """POST /api/telegram/auth/connect-with-code with invalid code should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-with-code",
            headers=auth_headers,
            json={"linkCode": "INVALID"}
        )
        
        # Should return 400 for invalid code
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✅ Invalid code correctly rejected with 400")
    
    def test_connect_with_short_code_returns_400(self, auth_headers):
        """POST /api/telegram/auth/connect-with-code with short code should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-with-code",
            headers=auth_headers,
            json={"linkCode": "ABC"}  # Too short
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✅ Short code correctly rejected with 400")
    
    def test_connect_with_code_without_token_returns_401(self):
        """POST /api/telegram/auth/connect-with-code without token should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-with-code",
            json={"linkCode": "TESTCODE"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Connect with code correctly requires authentication")
    
    def test_auto_connect_channel_requires_auth(self):
        """POST /api/telegram/auth/auto-connect-channel should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/auto-connect-channel",
            json={"channelId": "-1001234567890"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Auto-connect channel correctly requires authentication")
    
    def test_auto_connect_channel_with_auth(self, auth_headers):
        """POST /api/telegram/auth/auto-connect-channel with auth should work or return appropriate error"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/auto-connect-channel",
            headers=auth_headers,
            json={"channelId": "-1001234567890"}  # Fake channel ID
        )
        
        # Should return 400 (channel not found) or 200 (if somehow exists)
        # Not 401 (unauthorized) or 500 (server error)
        assert response.status_code in [200, 400], \
            f"Expected 200 or 400, got {response.status_code}: {response.text}"
        
        if response.status_code == 400:
            print("✅ Auto-connect channel correctly rejects non-existent channel")
        else:
            print("✅ Auto-connect channel endpoint working")


class TestTelegramChannelsEndpoint:
    """Test Telegram channels list endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tipster"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TIPSTER_EMAIL,
            "password": TIPSTER_PASSWORD
        })
        
        if response.status_code != 200 and response.status_code != 201:
            pytest.skip(f"Authentication failed: {response.status_code}")
        
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_channels_returns_list(self, auth_headers):
        """GET /api/telegram/channels should return list of connected channels"""
        response = requests.get(
            f"{BASE_URL}/api/telegram/channels",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Response should be a list or have a channels field
        if isinstance(data, list):
            channels = data
        else:
            channels = data.get("channels", data.get("data", []))
        
        assert isinstance(channels, list), "Channels should be a list"
        print(f"✅ Channels endpoint returned {len(channels)} channel(s)")
        
        # If there are channels, verify structure
        for channel in channels[:3]:  # Check first 3
            print(f"   Channel: {channel.get('channelTitle', channel.get('channel_title', 'N/A'))}")
    
    def test_get_channels_without_auth_returns_401(self):
        """GET /api/telegram/channels without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/telegram/channels")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Channels endpoint correctly requires authentication")


class TestTelegramAvailableChannels:
    """Test available channels endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tipster"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TIPSTER_EMAIL,
            "password": TIPSTER_PASSWORD
        })
        
        if response.status_code != 200 and response.status_code != 201:
            pytest.skip(f"Authentication failed: {response.status_code}")
        
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_available_channels(self, auth_headers):
        """GET /api/telegram/auth/available-channels should return available channels"""
        response = requests.get(
            f"{BASE_URL}/api/telegram/auth/available-channels",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "channels" in data or "connected" in data, \
            "Response should have 'channels' or 'connected' field"
        
        print(f"✅ Available channels: connected={data.get('connected')}, channels={len(data.get('channels', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
