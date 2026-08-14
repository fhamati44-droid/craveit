import { Sheet, SheetContent } from '@/components/ui/sheet';
import PressureFlow from './flows/PressureFlow';
import SurplusFlow from './flows/SurplusFlow';
import StrengthenFlow from './flows/StrengthenFlow';
import SoldOutFlow from './flows/SoldOutFlow';

const TITLES = {
  pressure: 'عندي ضغط',
  surplus: 'عندي كمية',
  strengthen: 'بدي أقوّي وجبة',
  sold_out: 'صنف خلص',
};

const FLOWS = {
  pressure: PressureFlow,
  surplus: SurplusFlow,
  strengthen: StrengthenFlow,
  sold_out: SoldOutFlow,
};

export default function QuickActionFlow({ open, flow, restaurantId, menuItems, prepTime, onClose, onDone }) {
  const Flow = FLOWS[flow];
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <SheetContent side="bottom" className="bg-tamam-bg text-tamam-text font-tamam" dir="rtl">
        <div className="px-1 pb-2 flex items-center justify-between">
          <h2 className="font-bold text-base">{TITLES[flow] || ''}</h2>
          <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center" aria-label="إغلاق">
            <span className="material-symbols-outlined text-tamam-text-muted">close</span>
          </button>
        </div>
        <div className="max-h-[74vh] overflow-y-auto pb-2">
          {Flow && (
            <Flow
              restaurantId={restaurantId}
              menuItems={menuItems}
              prepTime={prepTime}
              onDone={() => { onDone?.(); onClose?.(); }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}