export class PackageItineraryItem {
  dayNumber!: number;
  dayTitle?: string;
  description?: string;
  activities?: any;
  meals?: any;
  accommodation?: string;
  transport?: string;
  notes?: string;
}

export class CreatePackageDto {
  title!: string;
  description!: string;
  duration!: number;
  location!: string;
  active?: boolean;
  itineraryOverview?: any;
  logistics?: any;
  extras?: any;
  itineraries?: PackageItineraryItem[];
}
