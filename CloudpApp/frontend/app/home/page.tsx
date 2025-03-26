"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

// WebSocket for real-time updates
const socket = io("http://localhost:5000");

type Alarm = {
  _id: string;
  name: string;
  image: string;
};

const App = () => {
  // Typing alarms as Alarm[] and readAlarms as string[] (IDs of alarms)
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [readAlarms, setReadAlarms] = useState<Alarm[]>([]);

  useEffect(() => {
    fetchAlarms();

    // Listen for new alarms via WebSocket
    socket.on("newAlarm", (alarm: Alarm) => {
      setAlarms((prev) => [...prev, alarm]);
    });

    return () => {
      socket.off("newAlarm");
    };
  }, []);

  const fetchAlarms = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/alarms");
      setAlarms(response.data);
    } catch (error) {
      console.error("Error fetching alarms:", error);
    }
  };

  const markAsRead = async (alarmId: string) => {
    const alarm = alarms.find((a) => a._id === alarmId);
    if (alarm) {
      setReadAlarms((prev) => [...prev, alarm]); // Store the full alarm object
      setAlarms((prev) => prev.filter((alarm) => alarm._id !== alarmId)); // Remove from new alarms

      // Optionally update backend to mark as read
      await axios.put(`http://localhost:5000/api/alarms/${alarmId}`, { read: true });
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">Alarm Dashboard</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* New Alarms Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">🚨 New Alarms</h2>
          {alarms.length === 0 ? (
            <p className="text-gray-500">No new alarms.</p>
          ) : (
            alarms.map((alarm) => (
              <Card key={alarm._id} className="mb-4 shadow-lg">
                <CardContent>
                  <CardTitle>{alarm.name}</CardTitle>
                  <Image
                    src={`data:image/jpeg;base64,${alarm.image}`}
                    alt="Alarm"
                    className="w-full mt-2 rounded"
                    width={500} // Add width and height for better optimization
                    height={300}
                  />
                  <Button onClick={() => markAsRead(alarm._id)} className="mt-2 w-full bg-green-600">
                    Mark as Read
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Read Alarms Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">✅ Read Alarms</h2>
          {readAlarms.length === 0 ? (
            <p className="text-gray-500">No read alarms.</p>
          ) : (
            readAlarms.map((alarm) => (
              <Card key={alarm._id} className="mb-4 opacity-50">
                <CardContent>
                  <CardTitle>{alarm.name}</CardTitle>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
