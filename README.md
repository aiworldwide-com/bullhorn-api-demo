# Bullhorn Open API Example UI

A modern, reference implementation demonstrating how to interact with the Bullhorn Open API. This Next.js application showcases best practices for building data-rich dashboards with TypeScript, including authentication, data visualization, and real-time updates.

**This repository is provided as a demo. It is not supported, and is offered as-is, without warranty or guarantee of fitness for any purpose. Use at your own risk.**

## 🎯 Purpose

This project serves as a **developer reference** for integrating with the Bullhorn Open API. It demonstrates:

- Client credentials authentication
- API client generation from OpenAPI/Swagger specs
- Hierarchical data management
- Filtering and pagination

## 🔧 API Client Generation

This project uses the [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator) to automatically generate a type-safe TypeScript client from the Bullhorn API's Swagger/OpenAPI specification.

### How It Works

1. **Swagger Specification**: The `boa-swagger.json` file contains the complete API definition
2. **Generator Configuration**: `openapitools.json` defines generation settings
3. **Generated Client**: TypeScript client is created in `src/lib/api/generated/`

### Generated Code Location

```
src/lib/api/generated/
├── src/
│   ├── apis/         # API endpoint classes
│   ├── models/       # TypeScript interfaces
│   ├── runtime.ts    # Base runtime code
│   └── index.ts      # Exports
└── package.json
```

### Learn More About OpenAPI Generator

For more information on OpenAPI Generator and its capabilities:
- **GitHub**: https://github.com/OpenAPITools/openapi-generator
- **Documentation**: https://openapi-generator.tech/

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Bullhorn API Credentials** (Client ID and Client Secret)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aiworldwide-com/bullhorn-api-demo.git
   cd bullhorn-api-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

5. **Login with your credentials**
   
   Enter your Bullhorn API Client ID and Client Secret on the login screen.

## 📱 Application Screens

### 1. **Login**
The authentication screen is a demo of how to obtain a token from the API.

**Features:**
- Client credentials authentication
- Secure token storage
- Error handling for invalid credentials

---

### 2. **Home / Dashboard**
The main landing page displaying an overview of your Bullhorn environment.

**Features:**
- **Tenants List**: View all available tenants with their codes
- **JWT Token Details**: Display decoded JWT information including:
  - Token status (valid/expired)
  - Subject and Client ID
  - Issuer information
  - Expiration time and countdown
  - Issued date and scope

---

### 3. **Units**
Unit list with advanced filtering and data export capabilities.

**Features:**
- **Paginated Table**: Browse units with server-side pagination
- **Advanced Filters**:
  - Unit Name (search)
  - Unit Type
  - Facility ID
  - Serial Number
  - Unit Status
  - Last Packet Date
- **Sortable Columns**: Click column headers to sort
- **Export to CSV**: Download filtered data
- **Refresh**: Real-time data updates

**Displayed Information:**
- Unit ID, Name, Type
- Facility ID and Serial Number
- Unit Status (with badges)
- Last Packet Date
- Geographic coordinates (Latitude/Longitude)

---

### 4. **Unit Groups**
Hierarchical tree view of unit organization.

**Features:**
- **Tree Structure**: Expandable/collapsible hierarchy
- **Search**: Filter groups by name
- **Expand/Collapse All**: Quick navigation controls
- **Active/Inactive Toggle**: Filter by group status
- **Visual Indicators**:
  - Folder icons for groups
  - "All Units" badge for root groups
  - Inactive status badges

**Use Cases:**
- Understanding unit organization
- Navigating complex hierarchies
- Filtering units by group membership

---

### 5. **Data Points**
Detailed view of unit data points with hierarchical display.

**Features:**
- **Unit Grouping**: Data points organized by parent unit
- **Expandable Cards**: Click to view unit's data points
- **Advanced Filters**:
  - Unit search
  - Unit Type and Status
  - Unit Group selection
  - Hidden/Excluded toggles
  - Measurements only filter
- **Data Point Details**:
  - Default Name and Data Point Name
  - Engineering Label
  - Current and Previous Values
  - Measurement status
  - Alarm indicators
  - Enabled/Disabled state

**Displayed Unit Info:**
- Unit Name and Type
- Status badges
- Facility ID and Serial Number
- Last Packet Date
- Data Point count per unit

---

### 6. **Readings Dashboard**
Comprehensive historical data analysis with visualizations and geographic heatmaps.

**Features:**

#### Filters
- **Month Selection**: Navigate through last 18 months
- **Record Type**: All Records, Non-Alarm, or Alarm Records
- **Facility Type**: Filter by rectifier, test station, AC monitor, etc.

#### Statistics Cards
- Total Records count
- Alarm Records count and percentage
- Number of dynamic data columns
- Selected date range in days

#### Calendar Heatmap
- **Daily Activity View**: Visual representation of reading frequency
- **Color-Coded Intensity**: Darker squares = more readings
- **Interactive**: Click any day to filter to that specific date
- **Reset Option**: Return to full month view

#### Geographic Heatmap
- **Location-Based Visualization**: Readings plotted on an interactive map
- **Intensity Markers**: Color-coded by reading values
- **Zoom and Pan**: Explore geographic distribution
- **Automatic Clustering**: Groups nearby readings for clarity

#### Time-Series Charts
- **Per-Unit Charts**: Separate chart for each unit/facility
- **Multi-Series Lines**: Up to 5 numeric columns plotted simultaneously
- **Facility Headers**: 
  - Facility ID (prominent)
  - Facility Type
  - Unit Name and details
  - Serial Number and Unit ID
- **Interactive Tooltips**: Hover for exact values
- **Time-Scaled X-Axis**: Accurate temporal representation
- **Color-Coded Lines**: Distinct colors for each data series
