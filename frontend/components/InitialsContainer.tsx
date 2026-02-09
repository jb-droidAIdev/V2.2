import { cn, getInitials, getRoleColor } from '@/lib/utils';

interface InitialsContainerProps {
    name: string;
    role?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export default function InitialsContainer({ name, role = '', size = 'md', className }: InitialsContainerProps) {
    const initials = getInitials(name);
    const colorClass = getRoleColor(role);

    const sizeClasses = {
        xs: 'w-6 h-6 text-[9px]',
        sm: 'w-7 h-7 text-[10px]',
        md: 'w-8 h-8 text-xs',
        lg: 'w-10 h-10 text-sm',
        xl: 'w-12 h-12 text-base'
    };

    return (
        <div className={cn(
            "rounded-lg flex items-center justify-center font-black border shrink-0 shadow-sm transition-all duration-300",
            sizeClasses[size],
            colorClass,
            className
        )}>
            {initials}
        </div>
    );
}
