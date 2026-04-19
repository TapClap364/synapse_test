import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  margin?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '20px', borderRadius = '4px', margin = '0' }) => {
  return (
    <div 
      className="skeleton"
      style={{
        width,
        height,
        borderRadius,
        margin,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s infinite linear'
      }}
    />
  );
};

export const TaskSkeleton: React.FC = () => (
  <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', marginBottom: '12px' }}>
    <Skeleton width="40%" height="12px" margin="0 0 12px 0" />
    <Skeleton width="90%" height="16px" margin="0 0 8px 0" />
    <Skeleton width="70%" height="16px" margin="0 0 16px 0" />
    <div style={{ display: 'flex', gap: '8px' }}>
      <Skeleton width="60px" height="24px" borderRadius="12px" />
      <Skeleton width="60px" height="24px" borderRadius="12px" />
    </div>
  </div>
);
