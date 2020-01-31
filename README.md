# amazon-connect-ewt
caculate the estimate wait time for a new call


Introduction
One of the problems of modern contact centers is the ability to predict the average time that a new interaction is going to wait until it is transferred to an agent. Very often this value is used to announce to a customer how long he/she will wait in the queue if all agents are busy, assuming that this customer is extremely patient whereas all others could either wait until an agent is free or they abandon from the queue. This is known as Estimated Wait Time or EWT. Practically an interaction could be as a voice call, chat or email session or some other type of customer-agent relationship with a similar processing procedure.

Estimated wait time (EWT) predicts the amount of time a conversation has to wait in a queue before being answered. These predictions take into account the queue length, agent availability, handle time, as well as other system behaviors and variability at a given moment in time, i.e. when a request is made.

It is important to note that estimated wait time is different than ASA, where EWT predicts the transient state of the system and ASA gives the steady-state measure of the system over a period of time. Therefore, it is expected that EWT prediction would be different and would have more variability than ASA due to what is currently happening in the system, e.g. EWT for high workload times is most likely higher than ASA.

Methods of Calculating EWT
Estimated wait time (EWT) is calculated mainly by leveraging 2 types of formulas:

Queuing Theory: Multiply average handle time (AHT) for the queue with the position in queue (PiQ) of the caller, and dividing by the number of active agents (AA) on the queue. The estimated wait time is then adjusted for abandonment (ABN) by multiplying to an abandonment factor (1 - ABN) using our proprietary model derived automatically from historical data as part of the nightly batched process.

Head of Queue: Multiply the position in queue (PiQ) with time waited of the first person in queue (longest waiting time [LWT])

The following provides more information on the types of formula used in the EWT calculation:

Description	Formula	Notes
Queuing Theory with Abandonment
EWT1 = (AHT * PiQ / AA) * (1 - ABN)
Leverage queuing theory formula + taking into account customer patience profile (i.e. propensity to abandon)
Queuing Theory with Infinite Patience
EWT2 = (AHT * PiQ / AA)
Leverage queuing theory; does not take into account abandonment or likelihood to abandon
Head of Queue
EWT3 = PiQ * LWT
Use the wait time of the longest waiting interaction in queue as a baseline when AHT and AA information is not available
Note: The formula above is used in the order of appearance when a specific formula cannot be calculated due to missing information, e.g. EWT2 is used when there is no patience curve information found for the target queue.

It is important to note that if a queue contains conversations of different media types, the estimated wait time will be calculated based on the composition of each media type waiting in the queue and its urgency, i.e. immediate vs. deferred type work.

Special cases:

EWT returns zero when the queue is empty and there are activated agents who are idle and available.
EWT omits estimatedWaitTimeSeconds field when the queue is empty and there are no activated agents in the queue.
The following provides more details on each metric that makes up the above formula:

AA – Active Agents, i.e. the total number of active (logged in) agents in the target queue at the instance the request is made.

AA is derived from the real-time observation of the number of agent activated for the target queue. This includes agents that are currently handling conversations.
It is assumed that each agent can only have one of two states: busy on handling customer interactions or being ready to take on a new interaction.
When an agent is activated in multiple queues Nq, it is assumed that the agent's availability to handle an interaction from each queue is an equal proportion of its time (1 / Nq).

PiQ – Position in Queue, i.e. reflects how many interactions are currently waiting in the target queue waiting to be handled by agents, including itself.

PiQ is derived based on the actual arrival time and the conversation details which include: media type, current queue length, and how long interactions have been waiting in queue.
PiQ also takes into account utilization and interruptibility setting at org level, i.e. media types priorities (see: https://help.mypurecloud.com/articles/utilization/).
PiQ is assumed to enter to the end of the queue, unless it can interrupt other conversation(s) currently waiting in queue.
When querying for a conversation already waiting in queue, PiQ reflects the position in queue the conversation is currently in. Consequently, each subsequent EWT query will reflect its advancement through the queue.
Generally, a conversation that has:
Earlier arrival time has a smaller PiQ, while later arrival time has a higher PiQ.
Higher priority has a smaller PiQ. while lower priority has a higher PiQ.
Interrupting media type (e.g. inbound phone) has a smaller PiQ, while the interruptible media type (e.g. email) has a higher PiQ (driven by utilization setting).

AHT – Average Handle Time, i.e. the average value of an interaction service time durations.

AHT is derived from the average of the most recent 30-minute period call statistic when available or the steady-state average handle time of the past 7 days as a proxy when such information is not available (e.g. at the beginning of the call center's open hours when there are zero agents on queue for longer than 30 minutes).
The averaging sample includes the time between transferring a session to an agent and completing processing the session by the agent.
AHT = tHandle sum / tHandle count
tHandle sum = Cumulative Talk Time + Cumulative Hold Time + Cumulative After Call Work

ABN – Abandonment, i.e. the expected abandonment rate of customers waiting in queue.

ABN is derived from the average abandonment rate of the most recent 30-minute period call statistic and the Patience Curve of customers interacting in the target queue (a proprietary custom model that predicts the propensity of customers to abandon given time waited in a particular queue).
The effective abandonment rate is the weighted average of the perceived abandonment probability of each conversation in front of the target conversation (derived from Patience Curve).
This adjustment factor will reflect the 'true' number of conversation(s) ahead in queue due to abandonment.

LWT - Longest Waiting Time, i.e. the time the interaction at the head of the queue has been waiting for up to the time when the request is made.

LWT is derived from the current wait time of the first interaction in queue and is used as the baseline of the target conversation based on its position in queue, e.g. if there are 3 interactions in queue, then any new interaction would wait 4 times as long as the first one has been waiting in queue.
It is used in the Head-of-Queue formula only when there are interactions waiting in queue and there is no activated agents in the past 30 minutes up until the moment the query is made.
The EWT formula considers that agents can only process one interaction at a time as it happens in voice calls systems.
