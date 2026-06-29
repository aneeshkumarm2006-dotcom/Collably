'use client';

import { SlidersHorizontal } from 'lucide-react';

import { CATEGORIES, PLATFORMS, REWARD_TYPES } from '@/lib/shared';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

/** Creator-tier (follower bucket) options — website discovery concept. */
export const CREATOR_TIERS = [
  'Open to all',
  'Nano (1K–10K)',
  'Micro (10K–50K)',
  'Mid (50K+)',
] as const;

export interface CampaignFilters {
  categories: string[];
  rewardTypes: string[];
  platforms: string[];
  location: string;
  remoteOnly: boolean;
  creatorTier: string;
}

export const defaultCampaignFilters: CampaignFilters = {
  categories: [],
  rewardTypes: [],
  platforms: [],
  location: '',
  remoteOnly: false,
  creatorTier: 'Open to all',
};

export interface FilterSidebarProps {
  value: CampaignFilters;
  onChange: (next: CampaignFilters) => void;
  /** Optional per-category result counts (`{ Restaurant: 342, … }`). */
  categoryCounts?: Record<string, number>;
  className?: string;
}

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

function CheckRow({
  label,
  checked,
  count,
  onToggle,
}: {
  label: string;
  checked: boolean;
  count?: number;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted has-[button[data-state=checked]]:text-ink">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="flex-1">{label}</span>
      {typeof count === 'number' && <span className="font-mono text-xs text-faint">{count}</span>}
    </label>
  );
}

/**
 * FilterSidebar — explore filters as an accordion (category / location / reward
 * / platform / creator-tier). Controlled via `value` + `onChange`. Pair with
 * `FilterSidebarSheet` for the mobile drawer.
 */
export function FilterSidebar({ value, onChange, categoryCounts, className }: FilterSidebarProps) {
  const set = (patch: Partial<CampaignFilters>) => onChange({ ...value, ...patch });
  const hasFilters =
    value.categories.length > 0 ||
    value.rewardTypes.length > 0 ||
    value.platforms.length > 0 ||
    value.location.trim() !== '' ||
    value.remoteOnly ||
    value.creatorTier !== 'Open to all';

  return (
    <div className={cn('text-ink', className)}>
      <div className="flex items-center justify-between py-3.5">
        <h3 className="text-[15px] font-bold">Filters</h3>
        {hasFilters && (
          <button
            type="button"
            onClick={() => onChange(defaultCampaignFilters)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <Accordion
        type="multiple"
        defaultValue={['category', 'location', 'reward', 'platform', 'tier']}
      >
        <AccordionItem value="category">
          <AccordionTrigger>Category</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2.5">
            {CATEGORIES.map((c) => (
              <CheckRow
                key={c}
                label={c}
                count={categoryCounts?.[c]}
                checked={value.categories.includes(c)}
                onToggle={() => set({ categories: toggle(value.categories, c) })}
              />
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="location">
          <AccordionTrigger>Location</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3">
            <Input
              placeholder="City…"
              value={value.location}
              onChange={(e) => set({ location: e.target.value })}
            />
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted has-[button[data-state=checked]]:text-ink">
              <Checkbox
                checked={value.remoteOnly}
                onCheckedChange={(c) => set({ remoteOnly: c === true })}
              />
              <span>Remote / Online</span>
            </label>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="reward">
          <AccordionTrigger>Reward type</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2.5">
            {REWARD_TYPES.map((r) => (
              <CheckRow
                key={r}
                label={r}
                checked={value.rewardTypes.includes(r)}
                onToggle={() => set({ rewardTypes: toggle(value.rewardTypes, r) })}
              />
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="platform">
          <AccordionTrigger>Platform</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2.5">
            {PLATFORMS.map((p) => (
              <CheckRow
                key={p}
                label={p}
                checked={value.platforms.includes(p)}
                onToggle={() => set({ platforms: toggle(value.platforms, p) })}
              />
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tier">
          <AccordionTrigger>Creator tier</AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              value={value.creatorTier}
              onValueChange={(v) => set({ creatorTier: v })}
              className="gap-2.5"
            >
              {CREATOR_TIERS.map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2.5 text-sm text-muted has-[button[data-state=checked]]:text-ink"
                >
                  <RadioGroupItem value={t} />
                  <span>{t}</span>
                </label>
              ))}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/** Mobile filter drawer — a "Filters" button that opens the sidebar in a Sheet. */
export function FilterSidebarSheet(props: FilterSidebarProps & { triggerClassName?: string }) {
  const { triggerClassName, ...sidebar } = props;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(300px,85vw)] overflow-y-auto">
        <SheetHeader className="px-0 pt-0">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <FilterSidebar {...sidebar} />
      </SheetContent>
    </Sheet>
  );
}
