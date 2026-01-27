#!/usr/bin/env python3
"""
Water Level & Flow Data Fetcher for FFWS Citarum API
Fetches data from 'resources/waterlevel/Mst' and 'resources/flow/Mst'.
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Station configurations
STATIONS = {
    'tanjungpura': {
        'id': '206076204',
        'flow_id': '206075204', # Distinct ID for Flow
        'name': 'Tanjungpura (Sungai Citarum)',
        'thresholds': {
            'siaga1': 9.82,
            'siaga2': 9.42,
            'siaga3': 9.12
        }
    },
    'cibeet': {
        'id': '206076202',
        'flow_id': '206075202', # Updated with valid ID
        'name': 'Syphon Cibeet (Sungai Cibeet)',
        'thresholds': {
            'siaga1': 12.94,
            'siaga2': 12.54,
            'siaga3': 12.42
        }
    }
}

BASE_URL_LEVEL = "https://api.ffws-bbwscitarum.id/resources/waterlevel/Mst"
BASE_URL_FLOW = "https://api.ffws-bbwscitarum.id/resources/flow/Mst"
HOURS_BACK = 24

def fetch_api_data(base_url, station_id, sdt, edt):
    url = f"{base_url}/{station_id}/{sdt}/{edt}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        json_data = response.json()
        entries = json_data.get("resultData") or json_data.get("T") or []
        return entries
    except Exception as e:
        sys.stderr.write(f"Error fetching {url}: {e}\n")
        return []

def fetch_station_data(station_key):
    """Fetch level and flow data"""
    station = STATIONS[station_key]
    
    # Calculate time range (Force WIB = UTC+7)
    utc_now = datetime.utcnow()
    wib_now = utc_now + timedelta(hours=7)
    
    start = wib_now - timedelta(hours=HOURS_BACK)
    
    edt_str = wib_now.strftime("%Y%m%d%H%M")
    sdt_str = start.strftime("%Y%m%d%H%M")
    
    result = {
        'station_id': station['id'],
        'station_name': station['name'],
        'thresholds': station['thresholds'],
        'data': [],
        'fetched_at': datetime.now().isoformat(),
        'status': 'success',
        'current_level': 0.0,
        'current_flow': 0.0,
        'alert_status': 'normal',
        'trend': 'stable'
    }

    # 1. Fetch Water Level
    level_entries = fetch_api_data(BASE_URL_LEVEL, station['id'], sdt_str, edt_str)
    
    # 2. Fetch Flow (if configured)
    flow_entries = []
    if station.get('flow_id'):
        flow_entries = fetch_api_data(BASE_URL_FLOW, station['flow_id'], sdt_str, edt_str)
    
    # Process and Merge Data
    # We will dictionary-ize flow data by timestamp string for easy lookup
    flow_map = {}
    for entry in flow_entries:
        ymdhm = str(entry.get('ymdhm', ''))
        val = float(entry.get('fv') or entry.get('fw') or entry.get('value') or 0) # Check keys: fw, value, fv
        flow_map[ymdhm] = val
        
    processed_data = []
    
    # We drive the list by Water Level entries as primary
    for entry in level_entries:
        try:
            time_str = str(entry.get('ymdhm'))
            if len(time_str) == 12:
                dt = datetime.strptime(time_str, "%Y%m%d%H%M")
                level = float(entry.get('wl', 0))
                
                # Lookup flow
                flow = flow_map.get(time_str, 0.0)
                
                processed_data.append({
                    'date': dt.isoformat(),
                    'waterlevel': level,
                    'waterflow': flow,
                    'timestamp': dt.timestamp()
                })
        except ValueError:
            continue
            
    # Sort
    processed_data.sort(key=lambda x: x['timestamp'])
    result['data'] = processed_data
    
    if processed_data:
        latest = processed_data[-1]
        result['current_level'] = latest['waterlevel']
        result['current_flow'] = latest['waterflow']
        result['alert_status'] = get_alert_status(latest['waterlevel'], station['thresholds'])
        
        if len(processed_data) >= 2:
            prev = processed_data[-2]['waterlevel']
            diff = latest['waterlevel'] - prev
            if abs(diff) < 0.02: result['trend'] = 'stable'
            elif diff > 0: result['trend'] = 'rising'
            else: result['trend'] = 'falling'
            
    return result

def get_alert_status(level, thresholds):
    if level >= thresholds['siaga1']: return 'siaga1'
    elif level >= thresholds['siaga2']: return 'siaga2'
    elif level >= thresholds['siaga3']: return 'siaga3'
    else: return 'normal'

def fetch_all_stations():
    results = {}
    for k in STATIONS:
        results[k] = fetch_station_data(k)
    return results

if __name__ == '__main__':
    print(json.dumps(fetch_all_stations(), indent=2))
