export interface Ship {
  id: string;
  name: string;
  code: string;
  type: 'Passenger' | 'Cargo' | 'Ro-Ro Ferry' | 'Fast Craft';
  passengerCapacity: number;
  cargoCapacityTons: number;
  status: 'Active' | 'Maintenance' | 'Docked' | 'At Sea';
  createdAt: string;
}

export interface RouteItem {
  id: string;
  origin: string;
  destination: string;
  distanceNauticalMiles: number;
  estimatedHours: number;
  basePrice: number;
}

export interface Voyage {
  id: string;
  shipId: string;
  routeId: string;
  departureTime: string;
  arrivalTime: string;
  status: 'Scheduled' | 'Boarding' | 'Departed' | 'Arrived' | 'Cancelled';
  currentPassengers: number;
  currentCargoTons: number;
}

export interface PassengerManifest {
  id: string;
  voyageId: string;
  passengerName: string;
  idNumber: string;
  ticketNumber: string;
  classType: 'VIP' | 'Class 1' | 'Class 2' | 'Economy';
  seatNumber: string;
  fare: number;
  status: 'Checked-In' | 'Booked' | 'Boarded' | 'Cancelled';
}

export interface CargoManifest {
  id: string;
  voyageId: string;
  shipperName: string;
  cargoDescription: string;
  weightTons: number;
  containerNumber: string;
  freightCost: number;
  status: 'Manifested' | 'Loaded' | 'Delivered' | 'Hold';
}

export interface UserAdmin {
  email: string;
  role: 'Superadmin' | 'Dispatcher' | 'Port Master';
  name: string;
}
