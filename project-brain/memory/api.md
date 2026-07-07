# API Connections - api.md

## Mutual Fund APIs
*   **Base URL**: `https://api.mfapi.in`
*   **Endpoints**:
    *   `/mf`: Search for public schemes by search query.
    *   `/mf/{scheme_code}`: Retrieve details and historical NAV data.
*   **Cache Management**: The system cache stores meta in `scheme_nav_cache_meta` and historical data in `scheme_nav_history` with an expiration threshold of 24 hours.

## Bullion APIs
*   **Asset Rates**: Feeds gold (24k/22k) and silver spot rates dynamically for the bullion value tracking page.
