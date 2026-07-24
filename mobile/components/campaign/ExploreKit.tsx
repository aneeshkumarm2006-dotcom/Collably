/**
 * Presentational building blocks for the CREATOR Explore page — the premium
 * "Local Creator Crew" discovery design. These are pure presentation (no data fetching):
 * the Explore screen owns the query/pagination and feeds derived values in.
 *
 * Blue/white premium look driven entirely by `useTheme()` tokens (`colors.accent`
 * is the Meta blue), so light + dark both read correctly.
 */
import { type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/SafePressable';
import { TextInput } from '@/components/ui/SafeTextInput';
import { Icon, Button, type IconName } from '@/components/ui';
import { useTheme } from '@/components/ThemeProvider';
import { CATEGORY_ICON, categoryTint } from '@/components/home';
import { CoverImage } from './CoverImage';
import { CATEGORIES, type Category } from '@/constants';
import { formatCountdown, formatReward } from '@/lib/utils';
import type { Campaign } from '@/types';

// --- Header -------------------------------------------------------------------

/**
 * The Explore hero header: a small italic greeting, a two-line title with the
 * word "Collaborations" in accent blue, and a subtitle. `right` is the
 * bell + avatar cluster (built by the screen so the bell's unread state and the
 * signed-in avatar stay data-wired there).
 */
export function ExploreHeader({ name, right }: { name?: string; right?: ReactNode }) {
  const { colors } = useTheme();
  // Greet by first name when we know it, else a neutral fallback.
  const greetName = name?.trim().split(' ')[0] || 'there';
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontStyle: 'italic', fontSize: 14, fontWeight: '600', color: colors.accent, letterSpacing: -0.2 }}>
            Hey {greetName}! 👋
          </Text>
          <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -1, lineHeight: 35, marginTop: 6 }}>
            Discover Paid{'\n'}
            <Text style={{ color: colors.accent }}>Collaborations</Text>
          </Text>
          <Text style={{ fontSize: 13.5, color: colors.text2, marginTop: 9, lineHeight: 19 }}>
            Find brands, events & campaigns made for creators like you.
          </Text>
        </View>
        {right ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 }}>{right}</View>
        ) : null}
      </View>
    </View>
  );
}

// --- Stats row ----------------------------------------------------------------

export type ExploreStat = {
  icon: IconName;
  /** Pre-formatted big value, e.g. "128" or "$12.4M". */
  value: string;
  label: string;
  tone: 'blue' | 'green';
};

/** One rounded white card with four evenly-spaced stat cells. */
export function StatsRow({ stats }: { stats: ExploreStat[] }) {
  const { colors, shadows } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 6,
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 18,
        paddingVertical: 15,
        ...shadows.card,
      }}
    >
      {stats.map((s, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingHorizontal: 4,
            borderLeftWidth: i === 0 ? 0 : 1,
            borderLeftColor: colors.hair,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              backgroundColor: s.tone === 'green' ? colors.moneySoft : colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={s.icon} size={17} color={s.tone === 'green' ? colors.money : colors.accent} />
          </View>
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 8, letterSpacing: -0.3 }}>
            {s.value}
          </Text>
          <Text numberOfLines={2} style={{ fontSize: 10.5, color: colors.text2, marginTop: 2, textAlign: 'center', lineHeight: 13 }}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// --- Search + filter ----------------------------------------------------------

export function SearchPill({
  value,
  onChangeText,
  onClear,
  onFilter,
  activeFilters,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onClear: () => void;
  onFilter: () => void;
  activeFilters: number;
}) {
  const { colors, shadows } = useTheme();
  return (
    <View style={{ marginHorizontal: 20, marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.hair,
          borderRadius: 26,
          paddingHorizontal: 16,
          ...shadows.card,
        }}
      >
        <Icon name="search" size={18} color={colors.text3} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Find your next paid collaboration…"
          placeholderTextColor={colors.text3}
          returnKeyType="search"
          style={{ flex: 1, paddingVertical: 13, fontSize: 14.5, color: colors.text }}
        />
        {value.length > 0 ? (
          <Pressable onPress={onClear} hitSlop={8} accessibilityLabel="Clear search">
            <Icon name="x" size={17} color={colors.text3} />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={onFilter}
        accessibilityLabel={activeFilters > 0 ? `Filters, ${activeFilters} active` : 'Filters'}
        style={{
          width: 50,
          height: 50,
          borderRadius: 16,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.card,
        }}
      >
        <Icon name="sliders" size={20} color={colors.accentText} />
        {activeFilters > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 9,
              backgroundColor: colors.danger,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: colors.bg,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{activeFilters}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

// --- Category chips -----------------------------------------------------------

export function CategoryChips({
  active,
  onSelect,
}: {
  active?: Category;
  onSelect: (c?: Category) => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 18 }}
      contentContainerStyle={{ gap: 9, paddingHorizontal: 20, paddingVertical: 2 }}
    >
      <CategoryChip label="All" active={!active} onPress={() => onSelect(undefined)} />
      {CATEGORIES.map((c) => {
        const isActive = active === c;
        const tint = categoryTint(c, isDark);
        return (
          <CategoryChip
            key={c}
            label={c}
            icon={CATEGORY_ICON[c]}
            iconColor={isActive ? colors.accentText : tint.fg}
            active={isActive}
            onPress={() => onSelect(isActive ? undefined : c)}
          />
        );
      })}
    </ScrollView>
  );
}

function CategoryChip({
  label,
  icon,
  iconColor,
  active,
  onPress,
}: {
  label: string;
  icon?: IconName;
  iconColor?: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 22,
        backgroundColor: active ? colors.accent : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.hair,
      }}
    >
      {icon ? <Icon name={icon} size={15} color={iconColor ?? colors.text2} strokeWidth={2} /> : null}
      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? colors.accentText : colors.text2 }}>{label}</Text>
    </Pressable>
  );
}

// --- Featured campaign card ---------------------------------------------------

function deliverableSummary(campaign: Campaign): string {
  const total = campaign.deliverables.reduce((sum, d) => sum + d.quantity, 0);
  const first = campaign.deliverables[0];
  if (!first || total <= 0) return 'Content deliverables';
  const type = first.contentType ?? 'Post';
  return total === 1 ? `1 ${type} on ${first.platform}` : `${total} deliverables · ${first.platform}`;
}

/**
 * The hero "Featured" campaign card: cover with a FEATURED chip + bookmark,
 * title, a verified-brand row, a budget/deadline row, a deliverables summary,
 * and a full-width blue "Apply Now" button.
 */
export function FeaturedCard({
  campaign,
  businessName,
  isVerified,
  onPress,
  onApply,
}: {
  campaign: Campaign;
  businessName?: string;
  isVerified?: boolean;
  onPress: () => void;
  onApply: () => void;
}) {
  const { colors, shadows } = useTheme();
  const biz = businessName ?? 'Brand';
  const budget = formatReward(campaign.reward);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Featured campaign: ${campaign.title}`}
      style={{
        marginHorizontal: 20,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.hair,
        borderRadius: 20,
        overflow: 'hidden',
        ...shadows.cardStrong,
      }}
    >
      <CoverImage src={campaign.coverImage} category={campaign.category} style={{ width: '100%', aspectRatio: 16 / 9 }}>
        {/* FEATURED chip */}
        <View
          style={{
            position: 'absolute',
            top: 13,
            left: 13,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: colors.accent,
            paddingHorizontal: 11,
            paddingVertical: 5,
            borderRadius: 20,
          }}
        >
          <Icon name="star" size={12} color="#fff" />
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>FEATURED</Text>
        </View>
        {/* bookmark */}
        <View
          style={{
            position: 'absolute',
            top: 11,
            right: 11,
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: 'rgba(255,255,255,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="bookmark" size={17} color="#1C1E21" />
        </View>
      </CoverImage>

      <View style={{ padding: 16 }}>
        <Text numberOfLines={2} style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.4, lineHeight: 23 }}>
          {campaign.title}
        </Text>

        {/* verified brand row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '700', color: colors.text2, flexShrink: 1 }}>
            {biz}
          </Text>
          {isVerified ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="checkcircle" size={14} color={colors.accent} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>Verified Brand</Text>
            </View>
          ) : null}
        </View>

        {/* budget + deadline */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <Icon name="gift" size={16} color={colors.money} />
            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: colors.money, flexShrink: 1 }}>
              {budget}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="calendar" size={15} color={colors.text2} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2 }}>{formatCountdown(campaign.deadline)}</Text>
          </View>
        </View>

        {/* deliverables summary */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Icon name="file" size={14} color={colors.text3} strokeWidth={1.8} />
          <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.text3, flexShrink: 1 }}>
            {deliverableSummary(campaign)}
          </Text>
        </View>

        <View style={{ marginTop: 16 }}>
          <Button block onPress={onApply} iconRight="arrowR">
            Apply Now
          </Button>
        </View>
      </View>
    </Pressable>
  );
}
