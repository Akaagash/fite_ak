import React from 'react';
import { useParams } from 'react-router-dom';
import DailyWageJobResponses from './DailyWageJobResponses';
import LongTermJobResponses from './LongTermJobResponses';

const JobResponses: React.FC = () => {
    const { mode } = useParams<{ mode: string }>();

    if (mode === 'daily') {
        return <DailyWageJobResponses />;
    }

    return <LongTermJobResponses />;
};

export default JobResponses;
