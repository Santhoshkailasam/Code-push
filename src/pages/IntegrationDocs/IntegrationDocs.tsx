import React from 'react';
import { IntegrationScreen } from '../Integration/IntegrationScreen';
import type { Project } from '../../types';

interface IntegrationDocsProps {
  theme?: 'dark' | 'light';
  currentProject?: Project;
}

export const IntegrationDocs: React.FC<IntegrationDocsProps> = (props) => {
  return <IntegrationScreen {...props} />;
};

export default IntegrationDocs;
