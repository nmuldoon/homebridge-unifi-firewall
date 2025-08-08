# UniFi 9 Policy Implementation Summary

## What Was Implemented

✅ **Complete UniFi 9 Firewall Policy Support** - Added full support for toggling UniFi 9 firewall policies alongside existing traditional firewall rules.

### New Files Created:

1. **`src/unifi9Policy.ts`** - UniFi 9 Policy Manager

   - Custom implementation since unifi-client library doesn't support UniFi 9 policies yet
   - Discovers policies using multiple endpoint attempts
   - Handles policy state changes (enable/disable)

2. **`src/unifi9PolicyAccessory.ts`** - Homebridge Accessory for UniFi 9 Policies

   - Switch accessory implementation for HomeKit integration
   - Supports inverted logic (useful for "allow" policies you want to disable)
   - Real-time state updates and error handling

3. **`discover-policies.ts`** - Policy Discovery Tool

   - Helps users find their UniFi 9 policy IDs for configuration
   - Tests multiple API endpoints since UniFi 9 structure is undocumented
   - Provides both raw policy data and formatted output

4. **`discover.sh`** - User-friendly Discovery Script
   - Interactive script for non-technical users
   - Builds project and runs discovery tool
   - Prompts for UniFi Controller credentials

### Modified Files:

1. **`src/config.ts`** - Added UniFi 9 policy configuration interface
2. **`src/platform.ts`** - Enhanced platform to support both rule types
3. **`config.schema.json`** - Added UniFi 9 policies to Homebridge UI
4. **`package.json`** - Added discovery scripts
5. **`README.md`** - Complete documentation rewrite

## Key Features

### Dual Mode Support

- **Traditional Firewall Rules**: Original functionality preserved
- **UniFi 9 Policies**: New policy-based firewall control
- **Parallel Operation**: Both can be configured simultaneously

### Configuration Options

- Policy discovery by ID or name
- Optional display name override
- Inverted logic support for "allow" policies
- Flexible endpoint discovery for API changes

### Developer Tools

- Policy discovery script with multiple endpoint testing
- Interactive setup script for users
- Comprehensive error handling and logging
- TypeScript with full ESLint compliance

## Configuration Examples

### Traditional Firewall Rules

```json
{
  "platform": "UniFiFirewall",
  "unifi": {
    "url": "https://192.168.1.1",
    "username": "admin",
    "password": "password",
    "site": "default",
    "strictSSL": false
  },
  "rules": [
    {
      "id": "12345",
      "name": "Block Social Media",
      "inverted": false
    }
  ]
}
```

### UniFi 9 Policies

```json
{
  "platform": "UniFiFirewall",
  "unifi": {
    "url": "https://192.168.1.1",
    "username": "admin",
    "password": "password",
    "site": "default",
    "strictSSL": false
  },
  "unifi9Policies": [
    {
      "id": "507f1f77bcf86cd799439011",
      "displayName": "Gaming Policy",
      "inverted": false
    }
  ]
}
```

### Both Together

```json
{
  "platform": "UniFiFirewall",
  "unifi": {
    "url": "https://192.168.1.1",
    "username": "admin",
    "password": "password",
    "site": "default",
    "strictSSL": false
  },
  "rules": [
    {
      "id": "12345",
      "name": "Block Social Media",
      "inverted": false
    }
  ],
  "unifi9Policies": [
    {
      "id": "507f1f77bcf86cd799439011",
      "displayName": "Gaming Policy",
      "inverted": false
    }
  ]
}
```

## Usage Instructions

### 1. Discover Your Policies

```bash
# Interactive discovery
npm run discover

# Direct discovery with credentials
npm run discover-policies https://192.168.1.1 admin password default

# Using environment variables
export UNIFI_URL=https://192.168.1.1
export UNIFI_USERNAME=admin
export UNIFI_PASSWORD=password
npm run discover-policies
```

### 2. Update Configuration

- Add found policy IDs to your Homebridge config
- Use Homebridge UI for easy configuration
- Policies appear as switches in HomeKit

### 3. HomeKit Integration

- Policies appear as switches in the Home app
- Toggle switches to enable/disable policies
- Use inverted logic for "allow" policies you want to disable
- Combine with automation for scheduled control

## Technical Notes

### API Endpoints Tested

The discovery tool tests multiple endpoints since UniFi 9 API structure varies:

- `/rest/firewallpolicy`
- `/rest/policy`
- `/api/s/:site/rest/firewallpolicy`
- `/api/s/:site/rest/policy`
- `/rest/threat-management`
- `/rest/dpi`

### Error Handling

- Graceful fallback when UniFi 9 not available
- Policy not found warnings
- Connection error recovery
- Detailed logging for troubleshooting

### Backward Compatibility

- Original firewall rule functionality preserved
- Existing configurations continue to work
- Optional UniFi 9 policy support

## Testing Recommendations

1. **Build and Install**

   ```bash
   npm run build
   npm link
   ```

2. **Test Discovery**

   ```bash
   npm run discover
   ```

3. **Configure and Test**

   - Add policies to Homebridge config
   - Restart Homebridge
   - Test switches in HomeKit

4. **Verify Logs**
   - Check Homebridge logs for policy discovery
   - Verify policy state changes
   - Test both enable/disable operations

## Future Enhancements

- **Official API Support**: When unifi-client adds UniFi 9 support
- **Policy Templates**: Predefined policy configurations
- **Batch Operations**: Multiple policy control
- **Scheduling**: Time-based policy automation
- **Monitoring**: Policy usage statistics

## Troubleshooting

### Common Issues

1. **No Policies Found**: Check UniFi version (needs v9+)
2. **API Errors**: Verify credentials and network access
3. **Switch Not Responding**: Check policy ID accuracy
4. **Build Errors**: Run `npm install` and `npm run build`

### Debug Mode

Enable debug logging in Homebridge for detailed output:

```json
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "platforms": [
    {
      "platform": "UniFiFirewall",
      "_bridge": {
        "username": "CC:22:3D:E3:CE:31",
        "port": 51827
      }
    }
  ]
}
```

---

**Implementation Status**: ✅ Complete and Ready for Testing
**Next Steps**: Test with actual UniFi 9 controller and refine API endpoints based on real-world usage.
