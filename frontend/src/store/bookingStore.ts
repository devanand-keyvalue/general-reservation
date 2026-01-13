import { create } from 'zustand';
import type { Business, Service, AvailableSlot } from '@/lib/api';

type BookingStep = 'selection' | 'date' | 'time' | 'details' | 'confirm' | 'success';

interface BookingState {
  // Business info
  business: Business | null;
  services: Service[];
  
  // Booking flow state
  step: BookingStep;
  
  // Restaurant mode
  partySize: number;
  
  // Spa mode
  selectedService: Service | null;
  selectedStaffId: string | null;
  
  // Common
  selectedDate: Date | null;
  selectedSlot: AvailableSlot | null;
  availableSlots: AvailableSlot[];
  
  // Customer info
  customerName: string;
  customerPhone: string;
  notes: string;
  
  // Result
  bookingReference: string | null;
  bookingId: string | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setBusiness: (business: Business) => void;
  setServices: (services: Service[]) => void;
  setStep: (step: BookingStep) => void;
  setPartySize: (size: number) => void;
  setSelectedService: (service: Service | null) => void;
  setSelectedStaffId: (staffId: string | null) => void;
  setSelectedDate: (date: Date | null) => void;
  setSelectedSlot: (slot: AvailableSlot | null) => void;
  setAvailableSlots: (slots: AvailableSlot[]) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setNotes: (notes: string) => void;
  setBookingResult: (reference: string, id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  business: null,
  services: [],
  step: 'selection' as BookingStep,
  partySize: 2,
  selectedService: null,
  selectedStaffId: null,
  selectedDate: null,
  selectedSlot: null,
  availableSlots: [],
  customerName: '',
  customerPhone: '',
  notes: '',
  bookingReference: null,
  bookingId: null,
  isLoading: false,
  error: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,
  
  setBusiness: (business) => set({ business }),
  setServices: (services) => set({ services }),
  setStep: (step) => set({ step }),
  setPartySize: (partySize) => set({ partySize }),
  setSelectedService: (selectedService) => set({ selectedService }),
  setSelectedStaffId: (selectedStaffId) => set({ selectedStaffId }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setSelectedSlot: (selectedSlot) => set({ selectedSlot }),
  setAvailableSlots: (availableSlots) => set({ availableSlots }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setNotes: (notes) => set({ notes }),
  setBookingResult: (reference, id) => set({ bookingReference: reference, bookingId: id }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));

