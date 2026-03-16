import React, { useState, Children } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Stepper = ({
    children,
    initialStep = 1,
    onStepChange = () => { },
    onFinalStepCompleted = () => { },
    stepCircleContainerClassName = '',
    stepContainerClassName = '',
    contentClassName = '',
    footerClassName = '',
    backButtonProps = {},
    nextButtonProps = {},
    backButtonText = 'Back',
    nextButtonText = 'Next',
    disableStepIndicators = false,
    renderStepIndicator,
}: any) => {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [direction, setDirection] = useState(0);
    const stepsArray = Children.toArray(children);
    const totalSteps = stepsArray.length;
    const isCompleted = currentStep > totalSteps;
    const isLastStep = currentStep === totalSteps;

    const updateStep = (newStep: number) => {
        setDirection(newStep > currentStep ? 1 : -1);
        setCurrentStep(newStep);
        if (onStepChange) onStepChange(newStep);
    };

    const handleBack = () => {
        if (currentStep > 1) {
            updateStep(currentStep - 1);
        }
    };

    const handleNext = () => {
        if (!isLastStep) {
            updateStep(currentStep + 1);
        } else {
            updateStep(currentStep + 1);
            if (onFinalStepCompleted) onFinalStepCompleted();
        }
    };

    return (
        <div className={`flex flex-col h-full w-full gap-4 ${stepContainerClassName}`}>
            <div
                className={`flex justify-center mb-6 pt-4 ${stepCircleContainerClassName}`}
                style={{ display: disableStepIndicators ? 'none' : 'flex' }}
            >
                {stepsArray.map((_, index) => {
                    const stepNumber = index + 1;
                    const isactive = stepNumber === currentStep;
                    const isCompletedStep = stepNumber < currentStep;

                    return (
                        <div
                            key={stepNumber}
                            className="flex items-center"
                            onClick={() => !isCompleted && updateStep(stepNumber)}
                        >
                            {renderStepIndicator ? (
                                renderStepIndicator({
                                    step: stepNumber,
                                    currentStep,
                                    onStepClick: () => updateStep(stepNumber),
                                })
                            ) : (
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors border-2
                    ${isactive
                                            ? 'bg-green-600 border-green-600 text-white'
                                            : isCompletedStep
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : 'bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-white/10 text-neutral-500'
                                        }`}
                                >
                                    {isCompletedStep ? (
                                        <span className="text-lg">✓</span>
                                    ) : (
                                        <span className="font-bold">{stepNumber}</span>
                                    )}
                                </div>
                            )}
                            {stepNumber < totalSteps && (
                                <div
                                    className={`w-12 h-0.5 mx-2 transition-colors ${isCompletedStep ? 'bg-green-500' : 'bg-neutral-300 dark:bg-white/10'
                                        }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className={`flex-1 overflow-hidden relative ${contentClassName}`}>
                <AnimatePresence mode="popLayout" custom={direction}>
                    {!isCompleted ? (
                        <motion.div
                            key={currentStep}
                            variants={{
                                enter: (dir: number) => ({
                                    x: dir > 0 ? '100%' : '-100%',
                                    opacity: 0,
                                }),
                                center: { x: 0, opacity: 1 },
                                exit: (dir: number) => ({
                                    x: dir > 0 ? '-100%' : '100%',
                                    opacity: 0,
                                }),
                            }}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            custom={direction}
                            transition={{ duration: 0.3, type: 'spring', bounce: 0, damping: 25, stiffness: 300 }}
                            className="h-full w-full"
                        >
                            {stepsArray[currentStep - 1]}
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="h-full w-full flex flex-col items-center justify-center text-center p-8"
                        >
                            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-900/20">
                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">Success!</h2>
                            <p className="text-neutral-500 mt-2">Your job has been posted successfully.</p>
                            <button
                                onClick={() => window.location.href = '/posted-jobs'}
                                className="mt-8 px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 transition-transform"
                            >
                                View Posted Jobs
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {!isCompleted && (
                <div className={`flex justify-between items-center mt-6 pt-4 border-t border-neutral-200 dark:border-white/10 ${footerClassName}`}>
                    <button
                        onClick={handleBack}
                        className={`px-6 py-2 rounded-xl font-medium transition-colors ${currentStep === 1
                            ? 'text-neutral-400 cursor-not-allowed'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5'
                            }`}
                        disabled={currentStep === 1}
                        {...backButtonProps}
                    >
                        {backButtonText}
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-8 py-3 rounded-full font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all hover:scale-105 shadow-lg"
                        {...nextButtonProps}
                    >
                        {isLastStep ? 'Finish' : nextButtonText}
                    </button>
                </div>
            )}
        </div>
    );
};

export const Step = ({ children }: { children: React.ReactNode }) => {
    return <div className="h-full w-full">{children}</div>;
};

export default Stepper;
