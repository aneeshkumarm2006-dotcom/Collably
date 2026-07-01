import type { CampaignReward } from '@/lib/shared';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { rewardIcon } from '@/lib/domain-meta';

/**
 * RewardPill: the signature element. Reward icon + label, with the $ value in
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
  const Icon = rewardIcon(reward.type);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-sm border border-hair bg-secondary font-semibold text-ink',
        size === 'sm' ? 'px-2.5 py-1.5 text-[13px]' : 'w-full rounded-md px-4 py-3 text-[15px]',
        className,
      )}
    >
      <Icon aria-hidden className={cn('shrink-0', size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')} />

      <span className="min-w-0 truncate">{label}</span>
      {hasValue && (
        <span className="font-mono font-semibold text-money">
          · {formatCurrency(reward.estimatedValue as number)}
        </span>
      )}
    </span>
  );
}
