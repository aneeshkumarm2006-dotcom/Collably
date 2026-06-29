'use client';

/**
 * /styleguide — dev/QA route rendering every Phase 1 shared component. Most
 * sections render twice, side by side: a light panel and a `.dark`-scoped panel,
 * so the blend can be eyeballed in both themes at once. (Portalled overlays —
 * dropdowns, popovers, sheets, toasts — follow the GLOBAL theme; use the navbar
 * toggle to check those.)
 */
import { useState } from 'react';
import {
  CheckCircle2,
  DollarSign,
  FileText,
  Inbox,
  Send,
  Users,
} from 'lucide-react';

import type { CampaignReward } from '@/lib/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { StatusBadge, STATUS_TONE } from '@/components/shared/status-badge';
import { RewardPill } from '@/components/shared/reward-pill';
import { CategoryPill } from '@/components/shared/category-pill';
import { Avatar } from '@/components/shared/avatar';
import { CampaignCard, type CampaignCardData } from '@/components/shared/campaign-card';
import { StatCard } from '@/components/shared/stat-card';
import { ApplicationCard } from '@/components/shared/application-card';
import { CollabCard } from '@/components/shared/collab-card';
import { ImageUploadZone } from '@/components/shared/image-upload-zone';
import { StepProgress } from '@/components/shared/step-progress';
import { NotificationBell, type NotificationItem } from '@/components/shared/notification-bell';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmModal } from '@/components/shared/confirm-modal';
import {
  FilterSidebar,
  FilterSidebarSheet,
  defaultCampaignFilters,
  type CampaignFilters,
} from '@/components/shared/filter-sidebar';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { DashboardSidebar } from '@/components/shared/dashboard-sidebar';
import { DashboardTopBar } from '@/components/shared/dashboard-topbar';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { toast } from '@/lib/toast';

// --- Mock data ----------------------------------------------------------------

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

const reward: CampaignReward = {
  type: 'Product',
  description: 'Full skincare set',
  estimatedValue: 95,
};

const sampleCampaign: CampaignCardData = {
  id: 'c2',
  title: 'Launch our new Vitamin C Serum',
  category: 'Beauty',
  coverImage:
    'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&h=450&fit=crop&q=70',
  business: { name: 'Northern Glow', city: 'Montreal, QC' },
  reward,
  platform: 'Instagram',
  contentType: 'Reel',
  quantity: 2,
  deadline: inDays(10),
  spotsLeft: 6,
  applicationsCount: 41,
};

const notifications: NotificationItem[] = [
  {
    id: '1',
    text: (
      <>
        New application from <b>@toronto.eats</b> for &ldquo;Spring Tasting Menu&rdquo;
      </>
    ),
    time: '8 min ago',
    unread: true,
    dot: 'brand',
  },
  {
    id: '2',
    text: (
      <>
        Your application to <b>Pacific Catch</b> was <b>accepted</b>
      </>
    ),
    time: '1 hour ago',
    unread: true,
    dot: 'success',
  },
  {
    id: '3',
    text: <>&ldquo;Cold Brew Flight&rdquo; expires in <b>2 days</b></>,
    time: '3 hours ago',
    unread: true,
    dot: 'warn',
  },
];

const demoUser = {
  name: 'Priya Sharma',
  email: 'priya@example.com',
  role: 'creator' as const,
  avatar: null,
};

// --- Layout helpers -----------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-hair pt-10">
      <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** Renders content in a light panel and a `.dark`-scoped panel, side by side. */
function DualPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-hair bg-page p-6">{children}</div>
      <div className="dark rounded-lg border border-dark-border bg-page p-6 text-ink">{children}</div>
    </div>
  );
}

export default function StyleguidePage() {
  const [filters, setFilters] = useState<CampaignFilters>(defaultCampaignFilters);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Collably — Style Guide</h1>
          <p className="mt-1 text-sm text-muted">
            Phase 1 design system (the &ldquo;blend&rdquo;). App palette · reference anatomy ·
            shadcn/ui.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="mt-10 space-y-10">
        {/* Color tokens */}
        <Section title="Color tokens">
          <DualPanel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Brand', 'bg-brand', 'text-white'],
                ['Brand soft', 'bg-brand-soft', 'text-brand'],
                ['Money', 'bg-money', 'text-white'],
                ['Money soft', 'bg-money-soft', 'text-money'],
                ['Page', 'bg-page border border-hair', 'text-ink'],
                ['Card', 'bg-card border border-hair', 'text-ink'],
                ['Muted surface', 'bg-secondary', 'text-ink'],
                ['Hover', 'bg-brand-soft', 'text-brand'],
                ['Success', 'bg-success', 'text-white'],
                ['Warning', 'bg-warn', 'text-white'],
                ['Error', 'bg-danger', 'text-white'],
                ['Info', 'bg-info', 'text-white'],
              ].map(([label, bg, fg]) => (
                <div
                  key={label}
                  className={`flex h-16 items-end rounded-md p-2 text-xs font-semibold ${bg} ${fg}`}
                >
                  {label}
                </div>
              ))}
            </div>
          </DualPanel>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <DualPanel>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-ink">Heading 1 — system sans</h1>
              <h2 className="text-2xl font-bold tracking-tight text-ink">Heading 2</h2>
              <h3 className="text-lg font-semibold text-ink">Heading 3</h3>
              <p className="text-base text-ink">Body — the quick brown fox jumps over the lazy dog.</p>
              <p className="text-sm text-muted">Secondary / metadata text.</p>
              <p className="font-mono text-sm text-money">$2,450 · 12.4K followers · 3 spots left</p>
            </div>
          </DualPanel>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <DualPanel>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="money">Money</Button>
              <Button variant="destructive">Destructive</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Send">
                <Send />
              </Button>
            </div>
          </DualPanel>
        </Section>

        {/* Form controls */}
        <Section title="Form controls">
          <DualPanel>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sg-email">Email</Label>
                <Input id="sg-email" placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sg-bio">Bio</Label>
                <Textarea id="sg-bio" placeholder="Tell brands about yourself…" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beauty">Beauty</SelectItem>
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="fitness">Fitness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <Checkbox defaultChecked /> Remember me
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <Switch defaultChecked /> Notifications
                </label>
              </div>
              <RadioGroup defaultValue="creator" className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <RadioGroupItem value="creator" /> Creator
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <RadioGroupItem value="business" /> Business
                </label>
              </RadioGroup>
              <div className="space-y-2">
                <Label>Min followers</Label>
                <Slider defaultValue={[40]} max={100} step={1} />
              </div>
            </div>
          </DualPanel>
        </Section>

        {/* Badges + StatusBadge */}
        <Section title="Badges & status">
          <DualPanel>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.keys(STATUS_TONE).map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </div>
          </DualPanel>
        </Section>

        {/* Pills */}
        <Section title="Reward & category pills">
          <DualPanel>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <RewardPill reward={reward} />
                <RewardPill reward={{ type: 'Experience', description: 'Tasting for 2' }} />
                <RewardPill reward={{ type: 'Cash+Product', description: 'Outfit + cash', estimatedValue: 210 }} />
              </div>
              <RewardPill reward={reward} size="lg" />
              <div className="flex flex-wrap gap-2">
                <CategoryPill category="Beauty" count={195} active />
                <CategoryPill category="Restaurant" count={342} />
                <CategoryPill category="Fitness" count={134} />
                <CategoryPill category="Tech" count={87} />
              </div>
            </div>
          </DualPanel>
        </Section>

        {/* Avatars */}
        <Section title="Avatars">
          <DualPanel>
            <div className="flex flex-wrap items-end gap-4">
              <Avatar name="Priya Sharma" size={28} />
              <Avatar name="Maple Thyme" size={40} />
              <Avatar name="Northern Glow" size={54} />
              <Avatar name="Square Brand" size={54} shape="square" />
              <Avatar
                name="Photo User"
                size={54}
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&q=70"
              />
            </div>
          </DualPanel>
        </Section>

        {/* Disclosure / overlays */}
        <Section title="Tabs, accordion, progress, skeleton">
          <DualPanel>
            <div className="space-y-5">
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="accepted">Accepted</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="text-sm text-muted">
                  All applications.
                </TabsContent>
                <TabsContent value="pending" className="text-sm text-muted">
                  Pending applications.
                </TabsContent>
                <TabsContent value="accepted" className="text-sm text-muted">
                  Accepted applications.
                </TabsContent>
              </Tabs>
              <Accordion type="single" collapsible>
                <AccordionItem value="a">
                  <AccordionTrigger>How does pairing work?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted">
                    Businesses post campaigns; creators apply; both get matched.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Progress value={62} />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </DualPanel>
        </Section>

        {/* Menus / tooltips (global theme) */}
        <Section title="Tooltip · Popover · Dropdown · Bell (follow global theme)">
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-hair bg-card p-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>Helpful tip</TooltipContent>
            </Tooltip>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Open popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-sm text-muted">Popover content with app tokens.</p>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Dropdown</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <FileText className="h-4 w-4" /> View
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="h-4 w-4" /> Applicants
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <NotificationBell notifications={notifications} onMarkAllRead={() => toast('Marked all read')} />

            <Button onClick={() => toast.success('Application accepted — creator notified')}>
              Toast success
            </Button>
            <Button variant="outline" onClick={() => toast.error('Something went wrong')}>
              Toast error
            </Button>
          </div>
        </Section>

        {/* Campaign cards */}
        <Section title="Campaign cards">
          <DualPanel>
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <CampaignCard campaign={sampleCampaign} href="#" />
                <CampaignCard
                  campaign={{ ...sampleCampaign, applicationStatus: 'accepted', spotsLeft: 2 }}
                  href="#"
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <CampaignCard campaign={{ ...sampleCampaign, closed: true }} href="#" />
                <CampaignCard campaign={sampleCampaign} variant="compact" href="#" />
              </div>
            </div>
          </DualPanel>
        </Section>

        {/* Stat cards */}
        <Section title="Stat cards">
          <DualPanel>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Active applications" value={8} icon={<FileText />} delta={{ value: '+3', direction: 'up' }} />
              <StatCard label="Accepted" value={5} icon={<CheckCircle2 />} />
              <StatCard label="Completed" value={12} icon={<Users />} />
              <StatCard label="Rewards earned" value="$2,450" icon={<DollarSign />} money delta={{ value: '+18%', direction: 'up' }} />
            </div>
          </DualPanel>
        </Section>

        {/* Application cards */}
        <Section title="Application cards">
          <DualPanel>
            <div className="space-y-4">
              <ApplicationCard
                creator={{ name: 'Toronto Eats', handle: '@toronto.eats', followers: 12400 }}
                status="Pending"
                meta="Applied 2 days ago · Spring Tasting Menu"
                pitch="I'd love to feature your tasting menu in a cinematic reel for my food-focused audience."
                actions={
                  <>
                    <Button variant="outline" size="sm">
                      Reject
                    </Button>
                    <Button size="sm">Accept</Button>
                  </>
                }
              />
              <ApplicationCard
                creator={{ name: 'Van Foodie', handle: '@van.foodie', followers: 48000 }}
                status="Accepted"
                meta="Accepted yesterday"
              />
              <ApplicationCard
                creator={{ name: 'Cal Creator', handle: '@cal.creator', followers: 3200 }}
                status="Rejected"
                meta="Not selected"
              />
            </div>
          </DualPanel>
        </Section>

        {/* Collab cards */}
        <Section title="Collab cards">
          <DualPanel>
            <div className="space-y-4">
              <CollabCard
                title="Spring Tasting Menu — Reel Collab"
                counterparty={{ name: 'Maple & Thyme', role: 'Restaurant · Toronto' }}
                status="Accepted"
                reward={reward}
                deadline={inDays(2)}
                deliverables={[
                  { label: '1× Instagram Reel', done: true },
                  { label: '2× Stories', done: false },
                ]}
                actions={
                  <>
                    <Button size="sm">Submit content</Button>
                    <Button variant="outline" size="sm">
                      Message
                    </Button>
                  </>
                }
              />
              <CollabCard
                title="Cold Brew Flight — Summer Feature"
                counterparty={{ name: 'Brew & Bloom', role: 'Café · Ottawa' }}
                status="Overdue"
                deadline={inDays(-3)}
              />
            </div>
          </DualPanel>
        </Section>

        {/* Uploads + steppers */}
        <Section title="Image upload · Step progress">
          <DualPanel>
            <div className="space-y-6">
              <ImageUploadZone label="Upload a logo" hint="Square PNG works best" />
              <ImageUploadZone multiple maxFiles={6} label="Upload portfolio (up to 6)" />
              <PortfolioUploadDemo />
              <StepProgress steps={['Bio & Niche', 'Location', 'Socials', 'Content', 'Done']} current={2} />
            </div>
          </DualPanel>
        </Section>

        {/* Empty state */}
        <Section title="Empty state">
          <DualPanel>
            <EmptyState
              icon={<Inbox />}
              title="No applications yet"
              description="When creators apply to your campaigns, they'll show up here."
              action={<Button>Post a campaign</Button>}
            />
          </DualPanel>
        </Section>

        {/* Confirm modal */}
        <Section title="Confirm modal (global theme)">
          <div className="rounded-lg border border-hair bg-card p-6">
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              Delete campaign
            </Button>
            <ConfirmModal
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Delete this campaign?"
              description="This permanently removes the campaign and its applications. This can't be undone."
              confirmLabel="Delete"
              destructive
              onConfirm={() => {
                setConfirmOpen(false);
                toast.success('Campaign deleted');
              }}
            />
          </div>
        </Section>

        {/* Filter sidebar */}
        <Section title="Filter sidebar (+ mobile drawer)">
          <div className="rounded-lg border border-hair bg-card p-6">
            <div className="mb-4">
              <FilterSidebarSheet
                value={filters}
                onChange={setFilters}
                triggerClassName="lg:hidden"
              />
            </div>
            <div className="max-w-xs">
              <FilterSidebar
                value={filters}
                onChange={setFilters}
                categoryCounts={{ Restaurant: 342, Beauty: 195, Fitness: 134, Tech: 87 }}
              />
            </div>
          </div>
        </Section>

        {/* Navbar */}
        <Section title="Navbar (auth-aware, signed-out)">
          <div className="overflow-hidden rounded-lg border border-hair">
            <Navbar />
            <div className="h-24 bg-page" />
          </div>
          <div className="overflow-hidden rounded-lg border border-dark-border">
            <Navbar onDark />
            <div className="h-24 bg-dark-sidebar" />
          </div>
        </Section>

        {/* Dashboard shell */}
        <Section title="Dashboard shell (sidebar + topbar)">
          <div className="overflow-hidden rounded-lg border border-hair">
            <div className="flex h-[420px]">
              <DashboardSidebar role="creator" user={demoUser} />
              <div className="flex min-w-0 flex-1 flex-col">
                <DashboardTopBar
                  breadcrumbs={[{ label: 'Dashboard', href: '#' }, { label: 'Overview' }]}
                  user={demoUser}
                  notifications={notifications}
                />
                <div className="flex-1 bg-page p-6">
                  <p className="text-sm text-muted">Dashboard content area.</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <Section title="Footer">
          <div className="overflow-hidden rounded-lg border border-hair">
            <Footer />
          </div>
        </Section>
      </div>
    </main>
  );
}

/** Auto-upload variant of ImageUploadZone — signs + uploads straight to Cloudinary. */
function PortfolioUploadDemo() {
  const [urls, setUrls] = useState<string[]>([]);
  return (
    <ImageUploadZone
      multiple
      maxFiles={6}
      uploadFolder="portfolio"
      value={urls}
      onUploaded={(added) => setUrls((prev) => [...prev, ...added])}
      onRemoveExisting={(i) => setUrls((prev) => prev.filter((_, idx) => idx !== i))}
      label="Upload portfolio → Cloudinary"
      hint="Auto-uploads on drop (resized client-side)"
    />
  );
}
