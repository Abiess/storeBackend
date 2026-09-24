/**
 * Cleanup Helper for Demo Tests
 * 
 * Tracks created stores and cleans them up after tests to prevent DB pollution.
 * 
 * IMPORTANT:
 * - Only use with demo/test stores
 * - Never use in production with real customer data
 * - Requires valid JWT token for authentication
 */

class CleanupHelper {
  constructor() {
    this.createdStores = [];
    this.createdUsers = [];
  }

  /**
   * Track a created store for cleanup
   * @param {number} storeId - The ID of the created store
   * @param {string} token - JWT token for authentication
   */
  trackStore(storeId, token) {
    if (storeId && token) {
      this.createdStores.push({ storeId, token });
      console.log(`📝 Tracked store ID ${storeId} for cleanup`);
    }
  }

  /**
   * Track a created user for cleanup
   * @param {number} userId - The ID of the created user
   * @param {string} token - JWT token for authentication
   */
  trackUser(userId, token) {
    if (userId && token) {
      this.createdUsers.push({ userId, token });
      console.log(`📝 Tracked user ID ${userId} for cleanup`);
    }
  }

  /**
   * Extract store ID from URL or response
   * @param {string} url - URL containing store ID (e.g., /stores/123/...)
   * @returns {number|null} - Extracted store ID or null
   */
  extractStoreIdFromUrl(url) {
    const match = url.match(/\/stores\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Delete a single store via API
   * @param {number} storeId - Store ID to delete
   * @param {string} token - JWT token for authentication
   * @param {string} baseUrl - Base API URL
   * @returns {Promise<boolean>} - Success status
   */
  async deleteStore(storeId, token, baseUrl = 'https://markt.ma') {
    try {
      const apiUrl = baseUrl.replace(/\/$/, '');
      const response = await fetch(`${apiUrl}/api/stores/${storeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log(`✅ Deleted store ID ${storeId}`);
        return true;
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.log(`⚠️ Failed to delete store ID ${storeId}: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      console.log(`⚠️ Error deleting store ID ${storeId}:`, error.message);
      return false;
    }
  }

  /**
   * Delete a single user via API
   * @param {number} userId - User ID to delete
   * @param {string} token - JWT token for authentication
   * @param {string} baseUrl - Base API URL
   * @returns {Promise<boolean>} - Success status
   */
  async deleteUser(userId, token, baseUrl = 'https://markt.ma') {
    try {
      const apiUrl = baseUrl.replace(/\/$/, '');
      const response = await fetch(`${apiUrl}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log(`✅ Deleted user ID ${userId}`);
        return true;
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.log(`⚠️ Failed to delete user ID ${userId}: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      console.log(`⚠️ Error deleting user ID ${userId}:`, error.message);
      return false;
    }
  }

  /**
   * Clean up all tracked stores
   * @param {string} baseUrl - Base API URL
   * @returns {Promise<void>}
   */
  async cleanupStores(baseUrl = 'https://markt.ma') {
    if (this.createdStores.length === 0) {
      console.log('🧹 No stores to clean up');
      return;
    }

    console.log(`🧹 Cleaning up ${this.createdStores.length} store(s)...`);
    
    const results = await Promise.allSettled(
      this.createdStores.map(({ storeId, token }) =>
        this.deleteStore(storeId, token, baseUrl)
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`✅ Cleanup complete: ${successCount}/${this.createdStores.length} stores deleted`);
    
    // Clear the list
    this.createdStores = [];
  }

  /**
   * Clean up all tracked users
   * @param {string} baseUrl - Base API URL
   * @returns {Promise<void>}
   */
  async cleanupUsers(baseUrl = 'https://markt.ma') {
    if (this.createdUsers.length === 0) {
      console.log('🧹 No users to clean up');
      return;
    }

    console.log(`🧹 Cleaning up ${this.createdUsers.length} user(s)...`);
    
    const results = await Promise.allSettled(
      this.createdUsers.map(({ userId, token }) =>
        this.deleteUser(userId, token, baseUrl)
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`✅ Cleanup complete: ${successCount}/${this.createdUsers.length} users deleted`);
    
    // Clear the list
    this.createdUsers = [];
  }

  /**
   * Clean up everything (stores + users)
   * @param {string} baseUrl - Base API URL
   * @returns {Promise<void>}
   */
  async cleanupAll(baseUrl = 'https://markt.ma') {
    await this.cleanupStores(baseUrl);
    await this.cleanupUsers(baseUrl);
  }

  /**
   * Reset all tracked items (without deleting)
   */
  reset() {
    this.createdStores = [];
    this.createdUsers = [];
    console.log('🔄 Cleanup helper reset');
  }
}

module.exports = { CleanupHelper };
