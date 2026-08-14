import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
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
import AdminDemoData from '@/pages/admin/AdminDemoData';
import HomepageTimeAdmin from '@/pages/admin/HomepageTimeAdmin';
import MoodGame from '@/pages/MoodGame';
import CommunityMoods from '@/pages/CommunityMoods';
import CommunityMoodDetail from '@/pages/CommunityMoodDetail';
import AccountCommunityMoods from '@/pages/AccountCommunityMoods';
import CommunityMoodsAdmin from '@/pages/admin/CommunityMoodsAdmin';
import GameReferencesAdmin from '@/pages/admin/GameReferencesAdmin';
import AdminRestaurants from '@/pages/admin/Restaurants';
import RestaurantEdit from '@/pages/admin/RestaurantEdit';
import RestaurantMeals from '@/pages/admin/RestaurantMeals';
import RestaurantMenuItems from '@/pages/admin/RestaurantMenuItems';
import RestaurantMenuImport from '@/pages/admin/RestaurantMenuImport';
import RestaurantMenuMapping from '@/pages/admin/RestaurantMenuMapping';
import RestaurantMenuImages from '@/pages/admin/RestaurantMenuImages';
import MoodGameAdmin from '@/pages/admin/MoodGameAdmin';
import MoodGamePosts from '@/pages/admin/MoodGamePosts';
import MoodGamePostDetail from '@/pages/admin/MoodGamePostDetail';
import MoodGameReview from '@/pages/admin/MoodGameReview';
import MoodGameComments from '@/pages/admin/MoodGameComments';
import PartnerRoute from '@/components/partner/PartnerRoute';
import SelectRestaurant from '@/pages/partner/SelectRestaurant';
import PartnerHome from '@/pages/partner/PartnerHome';
import PartnerMenu from '@/pages/partner/PartnerMenu';
import PartnerMenuImport from '@/pages/partner/PartnerMenuImport';
import PartnerMenuAddCatalog from '@/pages/partner/PartnerMenuAddCatalog';
import PartnerMenuAddReview from '@/pages/partner/PartnerMenuAddReview';
import PartnerMenuAddTemplate from '@/pages/partner/PartnerMenuAddTemplate';
import PartnerMenuAddBranch from '@/pages/partner/PartnerMenuAddBranch';
import PartnerMenuDrafts from '@/pages/partner/PartnerMenuDrafts';
import PartnerOffers from '@/pages/partner/PartnerOffers';
import PartnerOfferRequest from '@/pages/partner/PartnerOfferRequest';
import PartnerOrders from '@/pages/partner/PartnerOrders';
import PartnerMore from '@/pages/partner/PartnerMore';
import PartnerPerformance from '@/pages/partner/PartnerPerformance';
import PartnerGuardrails from '@/pages/partner/PartnerGuardrails';
import PartnerSettings from '@/pages/partner/PartnerSettings';
import PartnerOfferCalendar from '@/pages/partner/PartnerOfferCalendar';
import PartnerOfferPlan from '@/pages/partner/PartnerOfferPlan';
import PartnerRestaurantProfile from '@/pages/partner/PartnerRestaurantProfile';
import PartnerAddMenuItem from '@/pages/partner/PartnerAddMenuItem';
import PartnerMenuItemDetail from '@/pages/partner/PartnerMenuItemDetail';
import PartnerOrderDetail from '@/pages/partner/PartnerOrderDetail';
import PartnerDemandSchedule from '@/pages/partner/PartnerDemandSchedule';

function App() {
  return (
    <AuthProvider>
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
              <Route path="/mood-game" element={<MoodGame />} />
              <Route path="/community-moods" element={<CommunityMoods />} />
              <Route path="/community-moods/:proposalId" element={<CommunityMoodDetail />} />
              <Route path="/account/community-moods" element={<AccountCommunityMoods />} />
              <Route path="/account/community-moods/:proposalId" element={<AccountCommunityMoods />} />
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
              <Route path="/admin/homepage-time-content" element={<HomepageTimeAdmin />} />
              <Route path="/admin/community-moods" element={<CommunityMoodsAdmin />} />
              <Route path="/admin/community-moods/game-references" element={<GameReferencesAdmin />} />
              <Route path="/admin/restaurants" element={<AdminRestaurants />} />
              <Route path="/admin/restaurants/new" element={<RestaurantEdit />} />
              <Route path="/admin/restaurants/:id/edit" element={<RestaurantEdit />} />
              <Route path="/admin/restaurants/:id/meals" element={<RestaurantMeals />} />
              <Route path="/admin/restaurants/:id/menu" element={<RestaurantMenuItems />} />
              <Route path="/admin/restaurants/:id/import" element={<RestaurantMenuImport />} />
              <Route path="/admin/restaurants/:id/mapping" element={<RestaurantMenuMapping />} />
              <Route path="/admin/restaurants/:id/images" element={<RestaurantMenuImages />} />
              <Route path="/admin/mood-game" element={<MoodGameAdmin />} />
              <Route path="/admin/mood-game/posts" element={<MoodGamePosts />} />
              <Route path="/admin/mood-game/posts/:postId" element={<MoodGamePostDetail />} />
              <Route path="/admin/mood-game/review" element={<MoodGameReview />} />
              <Route path="/admin/mood-game/comments" element={<MoodGameComments />} />
              <Route path="/admin/system-check" element={<SystemCheck />} />
              <Route path="/admin/demo-data" element={<AdminDemoData />} />
            </Route>
            <Route path="/partner" element={<PartnerRoute />}>
              <Route index element={<Navigate to="/partner/home" replace />} />
              <Route path="select-restaurant" element={<SelectRestaurant />} />
              <Route path="home" element={<PartnerHome />} />
              <Route path="menu" element={<PartnerMenu />} />
              <Route path="menu/items/new" element={<PartnerAddMenuItem />} />
              <Route path="menu/items/:itemId" element={<PartnerMenuItemDetail />} />
              <Route path="menu/import" element={<PartnerMenuImport />} />
              <Route path="menu/add/catalog" element={<PartnerMenuAddCatalog />} />
              <Route path="menu/add/review" element={<PartnerMenuAddReview />} />
              <Route path="menu/add/template" element={<PartnerMenuAddTemplate />} />
              <Route path="menu/add/branch" element={<PartnerMenuAddBranch />} />
              <Route path="menu/drafts" element={<PartnerMenuDrafts />} />
              <Route path="offers" element={<PartnerOffers />} />
              <Route path="offers/request" element={<PartnerOfferRequest />} />
              <Route path="offers/calendar" element={<PartnerOfferCalendar />} />
              <Route path="offers/plan" element={<PartnerOfferPlan />} />
              <Route path="orders" element={<PartnerOrders />} />
              <Route path="orders/:orderId" element={<PartnerOrderDetail />} />
              <Route path="demand-schedule" element={<PartnerDemandSchedule />} />
              <Route path="more" element={<PartnerMore />} />
              <Route path="performance" element={<PartnerPerformance />} />
              <Route path="guardrails" element={<PartnerGuardrails />} />
              <Route path="settings" element={<PartnerSettings />} />
              <Route path="more/restaurant-profile" element={<PartnerRestaurantProfile />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </CartProvider>
      </LanguageProvider>
    </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;