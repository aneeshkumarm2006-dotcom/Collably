import type { CampaignReward } from '@/lib/shared';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { rewardEmoji } from '@/lib/domain-meta';

/**
 * RewardPill — the signature element. Reward emoji + label, with the $ value in
 * FB-green mono (the "money" accent). `sm` = inline chip (cards); `lg` =
 * full-width row (campaign detail).
 */
export interface RewardPillProps {
  reward: CampaignReward;
  size?: 'sm' | 'lg';
  className?: string;
}

export function RewardPill({ reward, size = 'sm', className }: RewardPillProps) {
  const label = reward.description || reward.type;
  const hasValue = typeof reward.estimatedValue === 'number' && reward.estimatedValue > 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-sm border border-hair bg-secondary font-semibold text-ink',
        size === 'sm' ? 'px-2.5 py-1.5 text-[13px]' : 'w-full rounded-md px-4 py-3 text-[15px]',
        className,
      )}
    >
      <span aria-hidden className={size === 'lg' ? 'text-lg' : 'text-base'}>
        {rewardEmoji(reward.type)}
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {hasValue && (
        <span className="font-mono font-semibold text-money">
          · {formatCurrency(reward.estimatedValue as number)}
        </span>
      )}
    </span>
  );
}
