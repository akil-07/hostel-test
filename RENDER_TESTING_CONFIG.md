# Render Environment Configuration for PhonePe Testing

To fix the `KEY_NOT_CONFIGURED` error and ensure you are in **Testing Mode**, please go to your Render Dashboard -> Subscribed Service (Backend) -> **Environment Variables** and set the following:

| Variable Name | Value |
| :--- | :--- |
| `MERCHANT_ID` | `PGTESTPAYUAT` |
| `SALT_KEY` | `099eb0cd-02cf-4e2a-8aca-3e6c6aff0399` |
| `SALT_INDEX` | `1` |
| `PHONEPE_HOST_URL` | `https://api-preprod.phonepe.com/apis/pg-sandbox` |

## Important Notes:
1. **Delete any conflicting defaults:** If you see any existing values that point to `production` or `hermes` or a real Merchant ID, **delete or update them** to the values above.
2. **Redeploy:** After saving these variables in Render, you may need to manually trigger a **Deploy** (or it might auto-deploy) for the changes to take effect.
