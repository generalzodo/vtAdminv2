'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LocationsTab } from './tabs/locations-tab';
import { PricesTab } from './tabs/prices-tab';
import { TermsTab } from './tabs/terms-tab';
import { CommissionTab } from './tabs/commission-tab';
import { PopupTab } from './tabs/popup-tab';
import { BrandingTab } from './tabs/branding-tab';

type TabType = 'branding' | 'locations' | 'prices' | 'terms' | 'commission' | 'popup';

export function SettingsClient() {
  const [currentTab, setCurrentTab] = useState<TabType>('branding');

  const tabs = [
    { id: 'branding' as TabType, label: 'Branding', description: 'Company identity & theme' },
    { id: 'locations' as TabType, label: 'Location Setting', description: 'Manage available locations' },
    { id: 'prices' as TabType, label: 'Price Setting', description: 'Manage Prices' },
    { id: 'terms' as TabType, label: 'Terms & Conditions', description: 'Manage Terms and Conditions' },
    { id: 'commission' as TabType, label: 'Agent Commission', description: 'Manage Bus Commission Rates' },
    { id: 'popup' as TabType, label: 'Popup Settings', description: 'Manage website popup' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">System settings</p>
      </div>

      <div className="flex gap-5" style={{ minHeight: '81vh' }}>
        {/* Sidebar */}
        <div className="lg:w-1/4 w-full bg-white rounded-xl overflow-hidden shadow-md border border-gray-300 p-0">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={cn(
                'flex flex-nowrap justify-between items-center border-b border-gray-300 p-3 cursor-pointer select-none transition-colors',
                currentTab === tab.id ? 'bg-primary/10' : 'hover:bg-gray-50'
              )}
            >
              <div className="flex items-center">
                <div>
                  <span className="text-900 font-semibold block">{tab.label}</span>
                  <span className="block w-full text-600 text-sm truncate">{tab.description}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:w-3/4 w-full p-0">
          <Card>
            <CardContent className="p-6">
              {currentTab === 'branding' && <BrandingTab />}
              {currentTab === 'locations' && <LocationsTab />}
              {currentTab === 'prices' && <PricesTab />}
              {currentTab === 'terms' && <TermsTab />}
              {currentTab === 'commission' && <CommissionTab />}
              {currentTab === 'popup' && <PopupTab />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
