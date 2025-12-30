# Test Results - Módulo Landing de Afiliación Antia

## Test Context
- **Date:** 2025-12-30
- **Environment:** Preview (https://affilia-panel.preview.emergentagent.com)
- **Feature:** Sistema de Landings de Afiliación para Tipsters

## Testing Protocol
1. Test crear landing desde panel tipster
2. Test visualizar landing pública con gate +18
3. Test tracking de clicks
4. Test métricas de landing

## Test Credentials
- **Tipster:** fausto.perez@antia.com / Tipster123!

## API Endpoints to Test
- POST /api/tipster/landings - Create landing
- GET /api/tipster/landings - List tipster landings
- GET /api/tipster/landings/:id/metrics - Get metrics
- GET /api/go/:slug - Get public landing
- GET /api/r/:slug/:houseId - Track click and redirect

## Expected Results
- Tipster can create landings with multiple countries and houses
- Public landing shows +18 gate first
- Click tracking works and redirects to betting house
- Metrics show clicks by country and house
