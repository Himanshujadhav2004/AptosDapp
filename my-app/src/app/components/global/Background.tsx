import React from 'react';

interface Props {
  children: React.ReactNode;
}

const Background = ({ children }: Props) => {
  return (
    <main id='background' className="flex-none min-h-screen -z-10">
      {children}
    </main>
  );
};

export default Background;
