'use client';

import React, { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { Baby } from '@prisma/client';
import { SleepLogResponse, FeedLogResponse, DiaperLogResponse, MoodLogResponse, NoteResponse } from '@/app/api/types';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBubble } from "@/components/ui/status-bubble";
import { Baby as BabyIcon } from 'lucide-react';
import SleepModal from '@/components/modals/SleepModal';
import FeedModal from '@/components/modals/FeedModal';
import DiaperModal from '@/components/modals/DiaperModal';
import NoteModal from '@/components/modals/NoteModal';
import Timeline from '@/components/Timeline';
import SettingsModal from '@/components/modals/SettingsModal';
import { useBaby } from '../context/baby';

type ActivityType = SleepLogResponse | FeedLogResponse | DiaperLogResponse | MoodLogResponse | NoteResponse;

function HomeContent(): React.ReactElement {
  const { selectedBaby, sleepingBabies, setSleepingBabies } = useBaby();
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [showDiaperModal, setShowDiaperModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [localTime, setLocalTime] = useState<string>('');
  const lastSleepCheck = useRef<string>('');
  const [sleepStartTime, setSleepStartTime] = useState<Record<string, Date>>({});
  const [lastSleepEndTime, setLastSleepEndTime] = useState<Record<string, Date>>({});
  const [lastFeedTime, setLastFeedTime] = useState<Record<string, Date>>({});
  const [lastDiaperTime, setLastDiaperTime] = useState<Record<string, Date>>({});

  const refreshActivities = useCallback(async (babyId: string | undefined) => {
    if (!babyId) return;
    
    try {
      // Fetch timeline data
      const timelineResponse = await fetch(`/api/timeline?babyId=${babyId}&limit=200`);
      const timelineData = await timelineResponse.json();
      
      if (timelineData.success) {
        setActivities(timelineData.data);

        // Update last feed time
        const lastFeed = timelineData.data
          .filter((activity: ActivityType) => 'amount' in activity)
          .sort((a: FeedLogResponse, b: FeedLogResponse) => 
            new Date(b.time).getTime() - new Date(a.time).getTime()
          )[0];
        if (lastFeed) {
          setLastFeedTime(prev => ({
            ...prev,
            [babyId]: new Date(lastFeed.time)
          }));
        }

        // Update last diaper time
        const lastDiaper = timelineData.data
          .filter((activity: ActivityType) => 'condition' in activity)
          .sort((a: DiaperLogResponse, b: DiaperLogResponse) => 
            new Date(b.time).getTime() - new Date(a.time).getTime()
          )[0];
        if (lastDiaper) {
          setLastDiaperTime(prev => ({
            ...prev,
            [babyId]: new Date(lastDiaper.time)
          }));
        }
      }
    } catch (error) {
      console.error('Error refreshing activities:', error);
    }
  }, []);

  // Update unlock timer on any activity
  const updateUnlockTimer = () => {
    const unlockTime = localStorage.getItem('unlockTime');
    if (unlockTime) {
      localStorage.setItem('unlockTime', Date.now().toString());
    }
  };

  useEffect(() => {
    // Set initial time
    const now = new Date();
    setLocalTime(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);

    // Update time every minute
    const interval = setInterval(() => {
      const now = new Date();
      setLocalTime(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }, 60000);

    // Add listeners for user activity
    window.addEventListener('click', updateUnlockTimer);
    window.addEventListener('keydown', updateUnlockTimer);
    window.addEventListener('mousemove', updateUnlockTimer);
    window.addEventListener('touchstart', updateUnlockTimer);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', updateUnlockTimer);
      window.removeEventListener('keydown', updateUnlockTimer);
      window.removeEventListener('mousemove', updateUnlockTimer);
      window.removeEventListener('touchstart', updateUnlockTimer);
    };
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      if (selectedBaby?.id) {
        await refreshActivities(selectedBaby.id);
        await checkSleepStatus(selectedBaby.id);
      }
    };
    
    initializeData();
  }, [selectedBaby, refreshActivities]);

  const [sleepData, setSleepData] = useState<{
    ongoingSleep?: SleepLogResponse;
    lastEndedSleep?: SleepLogResponse & { endTime: string };
  }>({});

  const checkSleepStatus = async (babyId: string) => {
    // Prevent duplicate checks
    const checkId = `${babyId}-${Date.now()}`;
    if (lastSleepCheck.current === checkId) return;
    lastSleepCheck.current = checkId;

    try {
      const response = await fetch(`/api/timeline?babyId=${babyId}&limit=200`);
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data.success) return;
      
      // Filter for sleep logs only
      const sleepLogs = data.data
        .filter((activity: ActivityType): activity is SleepLogResponse => 
          'duration' in activity && 'startTime' in activity
        );
      
      // Find ongoing sleep
      const ongoingSleep = sleepLogs.find((log: SleepLogResponse) => !log.endTime);
      
      // Find last ended sleep
      const completedSleeps = sleepLogs
        .filter((log: SleepLogResponse): log is SleepLogResponse & { endTime: string } => 
          log.endTime !== null && typeof log.endTime === 'string'
        )
        .sort((a: SleepLogResponse & { endTime: string }, b: SleepLogResponse & { endTime: string }) => 
          new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
        );
      
      setSleepData({
        ongoingSleep,
        lastEndedSleep: completedSleeps[0]
      });
    } catch (error) {
      console.error('Error checking sleep status:', error);
    }
  };

  // Handle sleep status changes
  useEffect(() => {
    if (!selectedBaby?.id) return;

    const { ongoingSleep, lastEndedSleep } = sleepData;
    
    if (ongoingSleep) {
      setSleepingBabies(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedBaby.id);
        return newSet;
      });
      setSleepStartTime(prev => ({
        ...prev,
        [selectedBaby.id]: new Date(ongoingSleep.startTime)
      }));
    } else {
      setSleepingBabies(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedBaby.id);
        return newSet;
      });
      setSleepStartTime(prev => {
        const newState = { ...prev };
        delete newState[selectedBaby.id];
        return newState;
      });
      
      if (lastEndedSleep) {
        setLastSleepEndTime(prev => ({
          ...prev,
          [selectedBaby.id]: new Date(lastEndedSleep.endTime)
        }));
      }
    }
  }, [sleepData, selectedBaby]);

  return (
    <div className="relative isolate">
      {/* Action Buttons */}
      {selectedBaby?.id && (
        <div className="grid grid-cols-4 border-t-[1px] border-white">
          <Button
            variant="default"
            size="lg"
            className="h-20 p-0 flex items-center justify-center bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200 relative overflow-visible rounded-none border-r border-white"
            onClick={() => {
              updateUnlockTimer();
              setShowSleepModal(true);
            }}
          >
            {selectedBaby?.id && (
              sleepingBabies.has(selectedBaby.id) ? (
                <StatusBubble 
                  status="sleeping"
                  className="overflow-visible z-40"
                  durationInMinutes={Math.floor(
                    (new Date().getTime() - sleepStartTime[selectedBaby.id]?.getTime() || 0) / 60000
                  )}
                />
              ) : (
                !sleepStartTime[selectedBaby.id] && lastSleepEndTime[selectedBaby.id] && (
                  <StatusBubble 
                    status="awake"
                    className="overflow-visible z-40"
                    durationInMinutes={Math.floor(
                      (new Date().getTime() - lastSleepEndTime[selectedBaby.id].getTime()) / 60000
                    )}
                  />
                )
              )
            )}
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <img src="/crib-256.png" alt="Sleep" className="h-full w-full object-contain z-10" />
            </div>
            <span className="absolute bottom-1 text-sm font-medium z-20 bg-black/50 px-2 py-0.5 rounded-sm">
              {selectedBaby?.id && sleepingBabies.has(selectedBaby.id) ? 'End' : 'Start'}
            </span>
          </Button>
          <Button
            variant="default"
            size="lg"
            className="h-20 p-0 flex items-center justify-center relative overflow-visible text-gray-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200 bg-[#B8E6FE] rounded-none"
            onClick={() => {
              updateUnlockTimer();
              setShowFeedModal(true);
            }}
          >
            {selectedBaby?.id && lastFeedTime[selectedBaby.id] && (
              <StatusBubble 
                status="feed"
                className="overflow-visible z-40"
                durationInMinutes={Math.floor(
                  (new Date().getTime() - lastFeedTime[selectedBaby.id].getTime()) / 60000
                )}
                warningTime={selectedBaby.feedWarningTime}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <img src="/bottle-256.png" alt="Feed" className="h-full w-full object-contain z-10" />
            </div>
          </Button>
          <Button
            variant="default"
            size="lg"
            className="h-20 p-0 flex items-center justify-center bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200 relative overflow-visible rounded-none border-l border-white"
            onClick={() => {
              updateUnlockTimer();
              setShowDiaperModal(true);
            }}
          >
            {selectedBaby?.id && lastDiaperTime[selectedBaby.id] && (
              <StatusBubble 
                status="diaper"
                className="overflow-visible z-40"
                durationInMinutes={Math.floor(
                  (new Date().getTime() - lastDiaperTime[selectedBaby.id].getTime()) / 60000
                )}
                warningTime={selectedBaby.diaperWarningTime}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <img src="/diaper-256.png" alt="Diaper" className="h-full w-full object-contain z-10" />
            </div>
          </Button>
          <Button
            variant="default"
            size="lg"
            className="h-20 p-0 flex items-center justify-center bg-[#FFFF99] text-gray-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200 rounded-none border-l border-white relative overflow-hidden"
            onClick={() => {
              updateUnlockTimer();
              setShowNoteModal(true);
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <img src="/notepad-256.png" alt="Add Note" className="h-full w-full object-contain z-10" />
            </div>
          </Button>
        </div>
      )}

      {/* Timeline Section */}
      {selectedBaby && (
        <Card className="overflow-hidden border-t-[1px] border-b-0 border-l-0 border-r-0 border-white relative z-0">
          {activities.length > 0 ? (
            <Timeline 
              activities={activities} 
              onActivityDeleted={() => {
                if (selectedBaby?.id) {
                  refreshActivities(selectedBaby.id);
                }
              }}
            />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
                <BabyIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No activities yet</h3>
              <p className="text-sm text-gray-500">
                Start tracking your baby's activities using the buttons above
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Welcome Screen */}
      {!selectedBaby && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-12 text-center relative z-0">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-teal-100 flex items-center justify-center">
            <BabyIcon className="h-10 w-10 text-teal-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Welcome to Baby Tracker!</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Track your baby's daily activities including sleep, feeding, and diaper changes. Get started by adding your baby's information in the settings.
          </p>
          <Button
            onClick={() => {
              updateUnlockTimer();
              setShowSettingsModal(true);
            }}
            className="bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Open Settings
          </Button>
        </div>
      )}

      {/* Modals */}
      <SleepModal
        open={showSleepModal}
        onClose={async () => {
          setShowSleepModal(false);
          if (selectedBaby?.id) {
            await refreshActivities(selectedBaby.id);
            await checkSleepStatus(selectedBaby.id);
          }
        }}
        isSleeping={selectedBaby?.id ? sleepingBabies.has(selectedBaby.id) : false}
        onSleepToggle={() => {
          if (selectedBaby?.id) {
            setSleepingBabies((prev: Set<string>) => {
              const newSet = new Set(prev);
              if (newSet.has(selectedBaby.id)) {
                newSet.delete(selectedBaby.id);
              } else {
                newSet.add(selectedBaby.id);
              }
              return newSet;
            });
          }
        }}
        babyId={selectedBaby?.id || ''}
        initialTime={localTime}
      />
      <FeedModal
        open={showFeedModal}
        onClose={() => {
          setShowFeedModal(false);
          if (selectedBaby?.id) {
            refreshActivities(selectedBaby.id);
          }
        }}
        babyId={selectedBaby?.id || ''}
        initialTime={localTime}
      />
      <DiaperModal
        open={showDiaperModal}
        onClose={() => {
          setShowDiaperModal(false);
          if (selectedBaby?.id) {
            refreshActivities(selectedBaby.id);
          }
        }}
        babyId={selectedBaby?.id || ''}
        initialTime={localTime}
      />
      <NoteModal
        open={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          if (selectedBaby?.id) {
            refreshActivities(selectedBaby.id);
          }
        }}
        babyId={selectedBaby?.id || ''}
        initialTime={localTime}
      />
      <SettingsModal
        open={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          if (selectedBaby?.id) {
            refreshActivities(selectedBaby.id);
          }
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
