import React from 'react';

interface Props {
  title: string;
}

export const SectionBadge = ({ title }: Props) => {
  return (
    <div className="px-4 py-1 rounded-full bg-[rgba(11,195,162,0.2)] cursor-pointer select-none">
      <div className="bg-[linear-gradient(110deg,rgba(11,195,162,1),45%,rgba(11,195,162,0.6),55%,rgba(11,195,162,1))] bg-[length:250%_100%] bg-clip-text animate-background-shine text-transparent font-medium text-sm">
        {title}
      </div>
    </div>
  );
};
