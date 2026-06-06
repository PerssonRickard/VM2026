
import os
import requests

from odds.constants import TEAM_NAME_API_TO_DB

API_KEY = os.environ["ODDS_API_KEY"]

SPORT_KEY = "soccer_fifa_world_cup"

REGIONS = 'se'


def _parse_odds_json_response(json_response: list[dict], bookmaker_key: str | None = None) -> list[dict]:
    odds_per_match = []
    for match in json_response:
        home_team = TEAM_NAME_API_TO_DB[match["home_team"]]
        away_team = TEAM_NAME_API_TO_DB[match["away_team"]]

        bookmakers = match["bookmakers"]
        if bookmaker_key is not None:
            bookmakers = [b for b in bookmakers if b["key"] == bookmaker_key]
            if not bookmakers:
                continue

        all_odds = {home_team: [], away_team: [], "Draw": []}
        for bookmaker in bookmakers:
            market = next((m for m in bookmaker["markets"] if m["key"] == "h2h"), None)
            outcomes = {TEAM_NAME_API_TO_DB.get(outcome["name"], outcome["name"]): outcome["price"] for outcome in market["outcomes"]}
            for outcome, odds in all_odds.items():
                odds.append(outcomes[outcome])

        aggregated_odds = {
            outcome: round(1 / (sum(1/p for p in prices) / len(prices)), 2)
            for outcome, prices in all_odds.items()
        }
        odds_per_match.append({
            "home_team": home_team,
            "away_team": away_team,
            "odds": aggregated_odds,
        })
    return odds_per_match


def get_odds() -> list[dict]:
    odds_response = requests.get(f'https://api.the-odds-api.com/v4/sports/{SPORT_KEY}/odds', params={
        'api_key': API_KEY,
        'regions': REGIONS,
    })

    if odds_response.status_code != 200:
        raise ValueError(f'Failed to get odds: status_code {odds_response.status_code}, response body {odds_response.text}')

    odds_json = odds_response.json()

    # Check the usage quota
    print('Remaining requests', odds_response.headers['x-requests-remaining'])
    print('Used requests', odds_response.headers['x-requests-used'])

    aggregated_odds = _parse_odds_json_response(odds_json)
    return aggregated_odds
