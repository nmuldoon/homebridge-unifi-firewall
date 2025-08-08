# Homebridge UniFi 9 Policy Configuration Guide

## Step 1: Install the Plugin

If you haven't already installed the plugin:

```bash
# If using npm globally
npm install -g homebridge-unifi-firewall-toggle

# Or if using Homebridge Config UI
# Go to Plugins → Search for "homebridge-unifi-firewall" → Install
```

## Step 2: Configure the Plugin

### Using Homebridge Config UI (Recommended):

1. Open Homebridge Config UI (http://localhost:8581)
2. Go to **Plugins** tab
3. Find **"Homebridge UniFi Firewall"**
4. Click **Settings** button
5. Fill in your UniFi Controller details
6. Add your discovered policies in the "UniFi 9 Policies" section

### Manual Configuration:

Edit your `~/.homebridge/config.json` file:

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
      "unifi": {
        "url": "https://192.168.1.1",
        "username": "your_unifi_username",
        "password": "your_unifi_password",
        "site": "default",
        "strictSSL": false
      },
      "unifi9Policies": [
        {
          "id": "REPLACE_WITH_POLICY_ID_FROM_DISCOVERY",
          "displayName": "Gaming Policy",
          "inverted": false
        },
        {
          "id": "ANOTHER_POLICY_ID",
          "displayName": "Block Social Media",
          "inverted": true
        }
      ]
    }
  ]
}
```

## Step 3: Replace Policy IDs

From your discovery script output, copy the policy IDs and replace:

- `REPLACE_WITH_POLICY_ID_FROM_DISCOVERY` with actual policy ID
- `displayName` with a friendly name for HomeKit
- `inverted`:
  - `false` = switch ON enables the policy
  - `true` = switch ON disables the policy (useful for "allow" policies)

## Step 4: Restart Homebridge

```bash
# If using systemd
sudo systemctl restart homebridge

# If running manually
# Stop homebridge (Ctrl+C) and restart it

# If using Homebridge Config UI
# Use the restart button in the web interface
```

## Step 5: Add to HomeKit

1. Open the **Home** app on your iPhone/iPad
2. Look for new switches with your `displayName`
3. Add them to rooms and create automations as needed

## Configuration Options

### Policy Configuration:

- `id`: Policy ID from discovery script (required)
- `name`: Alternative to ID, can use policy name instead
- `displayName`: Name shown in HomeKit (optional, defaults to policy name)
- `inverted`: Flip the switch logic (optional, default: false)

### Example with Multiple Policies:

```json
"unifi9Policies": [
  {
    "id": "507f1f77bcf86cd799439011",
    "displayName": "Gaming Mode",
    "inverted": false
  },
  {
    "name": "Block Social Media",
    "displayName": "Focus Mode",
    "inverted": true
  },
  {
    "id": "507f1f77bcf86cd799439012",
    "displayName": "Parental Controls",
    "inverted": false
  }
]
```

## Troubleshooting

### Check Homebridge Logs:

```bash
# View logs
journalctl -u homebridge -f

# Or if using Config UI, check the logs tab
```

### Common Issues:

1. **Policy not found**: Check the policy ID is correct
2. **Authentication failed**: Verify UniFi credentials
3. **Switch not responding**: Check network connectivity to UniFi controller
4. **Policy not changing**: Verify the policy exists and you have permissions

### Debug Mode:

Add this to enable detailed logging:

```json
{
  "platform": "UniFiFirewall",
  "debug": true
  // ... other config
}
```

## Testing

1. **Test Discovery Again**:

   ```bash
   npm run discover
   ```

2. **Test Switch in HomeKit**:
   - Toggle the switch in the Home app
   - Check UniFi controller to verify policy changed
   - Check Homebridge logs for any errors

## Advanced Usage

### Automation Examples:

- **Gaming Mode**: Turn on gaming policy when you say "Gaming time"
- **Focus Mode**: Disable social media during work hours
- **Bedtime**: Enable parental controls at 9 PM

### Shortcuts Integration:

Create iOS Shortcuts to control multiple policies at once for different scenarios.
