import { Outlet } from 'react-router-dom';
import { PartnerProvider } from '@/lib/partnerContext';
import PartnerMobileLayout from '@/components/partner/PartnerMobileLayout';

/**
 * Protected entry to the Restaurant Partner OS. PartnerProvider enforces
 * authentication + active RestaurantMembership (or admin role) and exposes the
 * active restaurant + permissions via context. The customer shell never renders
 * here, and the partner shell never renders inside customer routes.
 */
export default function PartnerRoute() {
  return (
    <PartnerProvider>
      <PartnerMobileLayout>
        <Outlet />
      </PartnerMobileLayout>
    </PartnerProvider>
  );
}