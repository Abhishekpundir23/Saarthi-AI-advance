from langchain_core.tools import tool
import json

# Mock Real Estate Inventory
MOCK_INVENTORY = [
    {
        "id": "PROP001",
        "type": "Apartment",
        "bhk": "3 BHK",
        "location": "Andheri West, Mumbai",
        "price_inr": 25000000,
        "price_display": "2.5 Cr",
        "amenities": ["Gym", "Pool", "Parking"],
        "status": "Ready to Move",
        "minimum_price_inr": 24000000 # The absolute minimum the agent can negotiate down to
    },
    {
        "id": "PROP002",
        "type": "Apartment",
        "bhk": "2 BHK",
        "location": "Bandra East, Mumbai",
        "price_inr": 18000000,
        "price_display": "1.8 Cr",
        "amenities": ["Parking", "Security"],
        "status": "Under Construction",
        "minimum_price_inr": 17500000
    },
    {
        "id": "PROP003",
        "type": "Villa",
        "bhk": "4 BHK",
        "location": "Lonavala",
        "price_inr": 45000000,
        "price_display": "4.5 Cr",
        "amenities": ["Private Pool", "Garden", "Clubhouse"],
        "status": "Ready to Move",
        "minimum_price_inr": 43000000
    }
]

@tool("Search Real Estate Inventory")
def search_inventory(query: str, max_budget_inr: int = None) -> str:
    """
    Search the real estate inventory for properties matching the customer's query.
    Optionally filter by maximum budget in INR.
    Returns a JSON string of available properties.
    """
    results = []
    query_lower = query.lower()
    
    for prop in MOCK_INVENTORY:
        # Simple text matching on location, type, or bhk
        if (query_lower in prop['location'].lower() or 
            query_lower in prop['type'].lower() or 
            query_lower in prop['bhk'].lower() or
            query_lower == "all"):
            
            if max_budget_inr:
                if prop['price_inr'] <= max_budget_inr:
                    results.append(prop)
            else:
                results.append(prop)
                
    if not results:
        return json.dumps({"message": "No properties found matching those criteria."})
        
    # Hide the "minimum_price_inr" from the raw output so the agent doesn't immediately reveal it
    # We will pass it, but instruct the agent not to reveal it.
    return json.dumps(results)
