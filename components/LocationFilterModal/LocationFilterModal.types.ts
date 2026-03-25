export interface LocationFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (location: {
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
  };
}
