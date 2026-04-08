'use client';

import { useEffect, useState, use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { IconClock, IconMessageCircle } from '@tabler/icons-react';
import { ES } from '@/lib/spanish';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price_mxn: number;
  price_usd?: number;
  prep_time_minutes: number;
  image_url?: string;
  section: 'desayuno' | 'comida_cena' | '24_7';
}

interface SectionGroup {
  section: string;
  label: string;
  items: MenuItem[];
}

const SECTION_LABELS: Record<string, string> = {
  desayuno: ES.menu.sectionBreakfast,
  comida_cena: ES.menu.sectionLunchDinner,
  '24_7': ES.menu.sectionAnytime,
};

export default function MenuPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const [sections, setSections] = useState<SectionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('desayuno');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`/api/menu/${hotelId}`);
        if (!res.ok) {
          throw new Error('Failed to load menu');
        }
        const data = await res.json();
        setSections(data);
        // Set first section as active
        if (data.length > 0) {
          setActiveTab(data[0].section);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading menu');
      } finally {
        setLoading(false);
      }
    };

    if (hotelId) {
      fetchMenu();
    }
  }, [hotelId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-80 mb-8" />

          <div className="flex gap-2 mb-8">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-4 md:p-8 flex items-center justify-center">
        <Card className="border-destructive max-w-md">
          <CardHeader>
            <CardTitle>{ES.menu.notAvailable}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{ES.menu.title}</h1>
          <p className="text-slate-600 mt-1">{ES.menu.subtitle}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {sections.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">{ES.menu.noItems}</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-1 gap-2 mb-8 sm:grid-cols-3">
              {sections.map((section) => (
                <TabsTrigger
                  key={section.section}
                  value={section.section}
                  className="text-sm md:text-base"
                >
                  {SECTION_LABELS[section.section] || section.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.map((section) => (
              <TabsContent key={section.section} value={section.section} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                    {SECTION_LABELS[section.section] || section.label}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    {section.items.length} {ES.menu.itemCount}
                  </p>
                </div>

                <div className="grid gap-4 md:gap-6 md:grid-cols-2">
                  {section.items.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-slate-900 font-semibold mb-2">{ES.menu.helpTitle}</h3>
            <p className="text-slate-600 text-sm mb-4">
              {ES.menu.helpDescription}
            </p>
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <IconMessageCircle className="h-4 w-4" />
              {ES.menu.openChat}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow border-slate-200">
      {item.image_url && (
        <div className="aspect-video bg-slate-100 overflow-hidden">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="text-lg">{item.name}</CardTitle>
          {item.description && (
            <CardDescription className="text-sm">{item.description}</CardDescription>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2 flex-1">
            {item.prep_time_minutes && (
              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                <IconClock className="h-3 w-3" />
                <span>{item.prep_time_minutes} min</span>
              </Badge>
            )}
          </div>

          <div className="text-right">
            <p className="text-xl font-semibold text-slate-900">${item.price_mxn.toFixed(0)}</p>
            {item.price_usd && (
              <p className="text-xs text-slate-500">~${item.price_usd.toFixed(0)} USD</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
