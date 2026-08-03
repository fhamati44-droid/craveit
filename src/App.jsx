import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { CartProvider } from '@/lib/CartContext';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import AppLayout from '@/components/layout/AppLayout';
import CustomerMobileLayout from '@/components/tamam/customer/CustomerMobileLayout';

// Info pages
import HowTamamWorks from '@/pages/HowTamamWorks';
import TamamPoints from '@/pages/TamamPoints';

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
import CheckoutReview from '@/pages/CheckoutReview';
import CheckoutProcessing from '@/pages/CheckoutProcessing';
import OrderConfirmation from '@/pages/OrderConfirmation';
import OrderHistory from '@/pages/OrderHistory';
import OrderRate from '@/pages/OrderRate';
import OrderHelp from '@/pages/OrderHelp';
import TamamGame from '@/pages/TamamGame';
import TamamSuggestions from '@/pages/TamamSuggestions';
import TamamAdmin from '@/pages/TamamAdmin';
import TamamOrder from '@/pages/TamamOrder';
import CustomerDeals from '@/pages/CustomerDeals';
import Rewards from '@/pages/Rewards';
import AdminRoute from '@/components/admin/AdminRoute';
import GroupDealsDashboard from '@/pages/admin/GroupDealsDashboard';
import GroupDealWizard from '@/pages/admin/GroupDealWizard';
import GroupDealDetail from '@/pages/admin/GroupDealDetail';
import HomepageAdmin from '@/pages/admin/HomepageAdmin';
import HomepagePreview from '@/pages/admin/HomepagePreview';
import HomepageMedia from '@/pages/admin/HomepageMedia';
import SystemCheck from '@/pages/admin/SystemCheck';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <LanguageProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route element={<CustomerMobileLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/restaurants" element={<Restaurants />} />
              <Route path="/restaurants/:restaurantId" element={<Restaurant />} />
              <Route path="/restaurant/:slug" element={<Restaurant />} />
              <Route path="/tamam-game" element={<TamamGame />} />
              <Route path="/tamam-suggestions" element={<TamamCatalog />} />
              <Route path="/tamam-suggestions/:moodId" element={<TamamSuggestions />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/deals/:dealId" element={<DealDetail />} />
              <Route path="/deals/:dealId/join" element={<DealJoin />} />
              <Route path="/deals/:dealId/confirmed" element={<DealJoined />} />
              <Route path="/account/deals" element={<CustomerDeals />} />
              <Route path="/account/rewards" element={<Rewards />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
              <Route path="/orders" element={<OrderHistory />} />
              <Route path="/orders/:orderId" element={<OrderTracking />} />
              <Route path="/orders/:orderId/rate" element={<OrderRate />} />
              <Route path="/orders/:orderId/help" element={<OrderHelp />} />
              <Route path="/how-tamam-works" element={<HowTamamWorks />} />
              <Route path="/how-tamam-works/:topic" element={<HowTamamWorks />} />
              <Route path="/tamam-points" element={<TamamPoints />} />
              <Route path="/account/points" element={<Rewards />} />
            </Route>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/review" element={<CheckoutReview />} />
            <Route path="/checkout/processing" element={<CheckoutProcessing />} />
            <Route element={<AppLayout />}>
              <Route path="/search" element={<Search />} />
              <Route path="/order/:id" element={<OrderTracking />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="/tamam-order/:suggestionSetId" element={<TamamOrder />} />
            <Route path="/tamam-admin" element={<TamamAdmin />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/group-deals" element={<GroupDealsDashboard />} />
              <Route path="/admin/group-deals/new" element={<GroupDealWizard />} />
              <Route path="/admin/group-deals/:dealId" element={<GroupDealDetail />} />
              <Route path="/admin/group-deals/:dealId/edit" element={<GroupDealWizard />} />
              <Route path="/admin/homepage" element={<HomepageAdmin />} />
              <Route path="/admin/homepage/preview" element={<HomepagePreview />} />
              <Route path="/admin/homepage/media" element={<HomepageMedia />} />
              <Route path="/admin/system-check" element={<SystemCheck />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </CartProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;