# amazon-connect-ewt
caculate the estimate wait time for a new call

Queuing Theory: Multiply average handle time (AHT) for the queue with the position in queue (PiQ) of the caller, and dividing by the number of active agents (AA) on the queue. The estimated wait time is then adjusted for abandonment (ABN) by multiplying to an abandonment factor (1 - ABN) using our proprietary model derived automatically from historical data as part of the nightly batched process.

https://developer.mypurecloud.com/api/rest/v2/routing/estimatedwaittime.html
