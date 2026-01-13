import { BrowserRouter, Routes, Route, useParams, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { BookingWidget } from '@/components/booking/BookingWidget';
import { ManageBooking } from '@/components/booking/ManageBooking';
import { Dashboard } from '@/components/manager/Dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Utensils, Sparkles, Settings, Calendar } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

// Demo business IDs
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
const SPA_ID = '22222222-2222-2222-2222-222222222222';

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNlNTcwMWQiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center max-w-3xl mx-auto animate-fade-in">
            <h1 className="font-display text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text">
              Generic Booking System
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              A modern, embeddable booking widget for restaurants and spas.
              Beautiful design, seamless experience.
            </p>
          </div>
        </div>
      </div>
      
      {/* Demo cards */}
      <div className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Restaurant demo */}
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in stagger-1">
            <CardHeader>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Utensils className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">La Bella Tavola</CardTitle>
              <CardDescription>
                Restaurant booking demo with table management, party sizes, and timeline view.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link to={`/book/${RESTAURANT_ID}`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Book a Table
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to={`/manager/${RESTAURANT_ID}`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manager Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          {/* Spa demo */}
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in stagger-2">
            <CardHeader>
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <Sparkles className="h-7 w-7 text-accent" />
              </div>
              <CardTitle className="font-display text-2xl">Serenity Spa</CardTitle>
              <CardDescription>
                Spa booking demo with service selection, staff scheduling, and appointment management.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full bg-accent hover:bg-accent/90" size="lg">
                <Link to={`/book/${SPA_ID}`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to={`/manager/${SPA_ID}`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manager Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Features */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-semibold text-center mb-12">Features</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Embeddable Widget', desc: 'Drop-in booking widget for any website' },
              { title: 'Smart Availability', desc: 'Real-time slot calculation with resource management' },
              { title: 'Timeline Dashboard', desc: 'Visual management of bookings and resources' },
              { title: 'Staff Scheduling', desc: 'Manage staff availability and services' },
              { title: 'Self-Service', desc: 'Customers can view, modify, and cancel bookings' },
              { title: 'API Ready', desc: 'Full API for voice agents (Vapi) integration' },
            ].map((feature, index) => (
              <div 
                key={feature.title} 
                className={`p-5 rounded-xl bg-card border hover:shadow-lg transition-all animate-fade-in stagger-${index + 1}`}
              >
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingPage() {
  const { businessId } = useParams<{ businessId: string }>();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="max-w-lg mx-auto mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">← Back to Home</Link>
        </Button>
      </div>
      <BookingWidget businessId={businessId!} />
    </div>
  );
}

function ManageBookingPage() {
  const { businessId, bookingId } = useParams<{ businessId: string; bookingId?: string }>();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="max-w-md mx-auto mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">← Back to Home</Link>
        </Button>
      </div>
      <ManageBooking businessId={businessId!} bookingId={bookingId} />
    </div>
  );
}

function ManagerPage() {
  const { businessId } = useParams<{ businessId: string }>();
  
  return <Dashboard businessId={businessId!} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book/:businessId" element={<BookingPage />} />
          <Route path="/manage/:businessId" element={<ManageBookingPage />} />
          <Route path="/manage/:businessId/:bookingId" element={<ManageBookingPage />} />
          <Route path="/manager/:businessId" element={<ManagerPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
