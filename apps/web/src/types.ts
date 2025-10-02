export interface Activity {
  id?: string;
  title: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
}

export interface ActivityItemProps {
  activity: Activity;
  onRemove: () => void;
  isRemoving: boolean;
}
