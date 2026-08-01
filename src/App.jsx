import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { CartProvider } from '@/lib/CartContext';
import AppLayout from '@/components/layout/AppLayout';
import CustomerMobileLayout from '@/components/tamam/customer/CustomerMobileLayout';

// Pages
import Home from '@/pages/Home';
import Restaurant from '@/pages/Restaurant';
import Checkout from '@/pages/Checkout';
import OrderTracking from '@/pages/OrderTracking';
import Profile from '@/pages/Profile';
import Search from '@/pages/Search';
import Restaurants from '@/pages/Restaurants';
import TamamCatalog from '@/pages/TamamCatalog';
import Deals from '@/pages/Deals';
import DealDetail from '@/pages/DealDetail';
import DealJoin from '@/pages/DealJoin';
import DealJoined from '@/pages/DealJoined';
import Cart from '@/pages/Cart';
import TamamGame from '@/pages/TamamGame';
import TamamSuggestions from '@/pages/TamamSuggestions';
import TamamAdmin from '@/pages/TamamAdmin';
import TamamOrder from '@/pages/TamamOrder';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <CartProvider>
        <Router>
          <Routes>
            <Route element={<CustomerMobileLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/restaurants" element={<Restaurants />} />
              <Route path="/restaurant/:slug" element={<Restaurant />} />
              <Route path="/tamam-game" element={<TamamGame />} />
              <Route path="/tamam-suggestions" element={<TamamCatalog />} />
              <Route path="/tamam-suggestions/:moodId" element={<TamamSuggestions />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/deals/:dealId" element={<DealDetail />} />
              <Route path="/deals/:dealId/join" element={<DealJoin />} />
              <Route path="/deals/:dealId/confirmed" element={<DealJoined />} />
              <Route path="/cart" element={<Cart />} />
            </Route>
            <Route element={<AppLayout />}>
              <Route path="/search" element={<Search />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order/:id" element={<OrderTracking />} />
              <Route path="/orders" element={<OrderTracking />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="/tamam-order/:suggestionSetId" element={<TamamOrder />} />
            <Route path="/tamam-admin" element={<TamamAdmin />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;