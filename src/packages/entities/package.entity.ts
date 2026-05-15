export class Package {
  id!: string;
  title!: string;
  description!: string;
  duration!: number;
  location!: string;
  active!: boolean;
  createdAt!: Date;
  itineraryOverview?: any;
  logistics?: any;
  extras?: any;
}
