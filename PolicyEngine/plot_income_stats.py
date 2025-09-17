from policyengine_us import Microsimulation
import numpy as np
import geopandas as gpd
import matplotlib.pyplot as plt
import pandas as pd

sim = Microsimulation(dataset = "hf://policyengine/test/sparse_cd_stacked_2023.h5")

# Quick fix for state ids that don't match (NOTE: these are resampled, reweighted households)
cd_geoids = sim.calculate("congressional_district_geoid").values
correct_state_fips = cd_geoids // 100
sim.set_input("state_fips", 2023, correct_state_fips)

# Get an analysis dataframe
df = sim.calculate_dataframe(['household_id', 'state_fips', 'congressional_district_geoid', 'income_tax', 'household_weight'])

# Load the hexagon shapefile for voting districts
hex_gdf = gpd.read_file('HexCDv31/HexCDv31.shp')
hex_gdf['cd_id'] = hex_gdf['GEOID'].astype(int)

# Load non-voting districts shapefile and extract only DC
nonvoting_gdf = gpd.read_file('HexDDv20/HexDDv20.shp')
# Filter for DC only (GEOID 1198)
dc_gdf = nonvoting_gdf[nonvoting_gdf['GEOID'] == '1198'].copy()
dc_gdf['cd_id'] = dc_gdf['GEOID'].astype(int)
# Add state abbreviation column to match main shapefile structure
dc_gdf['STATEAB'] = dc_gdf['ABBREV']
dc_gdf['STATENAME'] = dc_gdf['NAME']
dc_gdf['CDLABEL'] = dc_gdf['ABBREV']

# Combine voting districts with DC only
hex_gdf = pd.concat([hex_gdf, dc_gdf], ignore_index=True)

# Fix single-district state mappings (at-large districts)
# These states have GEOID ending in 00 in shapefile but 01 in the data
single_district_states = {
    200: 201,   # Alaska
    1000: 1001, # Delaware  
    3800: 3801, # North Dakota
    4600: 4601, # South Dakota
    5000: 5001, # Vermont
    5600: 5601, # Wyoming
    1198: 1101  # DC (from 1198 in shapefile to 1101 in PolicyEngine data)
}
hex_gdf['cd_id'] = hex_gdf['cd_id'].replace(single_district_states)

# Aggregate income tax by congressional district (weighted average)
district_stats = df.groupby('congressional_district_geoid').apply(
    lambda x: pd.Series({
        'total_income_tax': (x['income_tax'] * x['household_weight']).sum(),
        'total_households': x['household_weight'].sum(),
        'avg_income_tax': (x['income_tax'] * x['household_weight']).sum() / x['household_weight'].sum()
    })
).reset_index()

# Merge data with shapefile
merged_gdf = hex_gdf.merge(
    district_stats, 
    left_on='cd_id', 
    right_on='congressional_district_geoid',
    how='left'
)

# Create the visualization
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 10))

# Plot 1: Total Income Tax
merged_gdf.plot(
    column='total_income_tax',
    ax=ax1,
    legend=True,
    cmap='RdYlGn_r',
    edgecolor='black',
    linewidth=0.3,
    missing_kwds={'color': 'lightgray', 'label': 'No Data'}
)
ax1.set_title('Total Income Tax by Congressional District', fontsize=14, fontweight='bold')
ax1.axis('off')

# Plot 2: Average Income Tax per Household
merged_gdf.plot(
    column='avg_income_tax',
    ax=ax2,
    legend=True,
    cmap='viridis',
    edgecolor='black',
    linewidth=0.3,
    missing_kwds={'color': 'lightgray', 'label': 'No Data'}
)
ax2.set_title('Average Income Tax per Household by Congressional District', fontsize=14, fontweight='bold')
ax2.axis('off')

plt.suptitle('Income Tax Analysis by Congressional District (2023)', fontsize=16, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig('income_tax_by_district.png', dpi=300, bbox_inches='tight')
plt.show()

# Print summary statistics
print("\n=== Summary Statistics ===")
print(f"Districts with data: {district_stats.shape[0]}")
print(f"Total districts in shapefile: {hex_gdf.shape[0]}")

# Check which districts are missing
districts_with_data = set(district_stats['congressional_district_geoid'])
districts_in_shapefile = set(hex_gdf['cd_id'])
missing_districts = districts_in_shapefile - districts_with_data
print(f"\nMissing districts (in shapefile but no data): {len(missing_districts)}")
if missing_districts:
    # Get state and district info for missing districts
    missing_info = []
    for cd_id in sorted(missing_districts):
        row = hex_gdf[hex_gdf['cd_id'] == cd_id].iloc[0]
        state = row['STATEAB']
        label = row['CDLABEL']
        missing_info.append(f"  {state}-{label} (GEOID: {cd_id:04d})")
    print("Districts without data:")
    for info in missing_info[:10]:  # Show first 10
        print(info)
    if len(missing_info) > 10:
        print(f"  ... and {len(missing_info) - 10} more")

# Check if DC is in the data
dc_districts = df[df['congressional_district_geoid'] // 100 == 11]  # DC FIPS is 11
print(f"\nDC data check:")
print(f"  DC households in dataset: {len(dc_districts)}")
if len(dc_districts) > 0:
    print(f"  DC district GEOIDs in data: {sorted(dc_districts['congressional_district_geoid'].unique())}")
    dc_stats = district_stats[district_stats['congressional_district_geoid'] == 1101]
    if not dc_stats.empty:
        print(f"  DC total income tax: ${dc_stats.iloc[0]['total_income_tax']:,.0f}")
        print(f"  DC avg income tax: ${dc_stats.iloc[0]['avg_income_tax']:,.0f}")
print(f"\nTop 5 Districts by Total Income Tax:")
top_5 = district_stats.nlargest(5, 'total_income_tax')[['congressional_district_geoid', 'total_income_tax', 'avg_income_tax']]
top_5['total_income_tax'] = top_5['total_income_tax'].apply(lambda x: f"${x:,.0f}")
top_5['avg_income_tax'] = top_5['avg_income_tax'].apply(lambda x: f"${x:,.0f}")
print(top_5.to_string(index=False))

print(f"\nBottom 5 Districts by Total Income Tax:")
bottom_5 = district_stats.nsmallest(5, 'total_income_tax')[['congressional_district_geoid', 'total_income_tax', 'avg_income_tax']]
bottom_5['total_income_tax'] = bottom_5['total_income_tax'].apply(lambda x: f"${x:,.0f}")
bottom_5['avg_income_tax'] = bottom_5['avg_income_tax'].apply(lambda x: f"${x:,.0f}")
print(bottom_5.to_string(index=False))
