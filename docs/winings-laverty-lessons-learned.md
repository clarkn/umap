# What We Built

Jake and I built a system that synchronizes map data between multiple
distinct clients. We identified and confirmed Redis as a technical
solution that both allows for real(-ish) time synchronization and even
makes that synchronization relatively painful. We built our system
using Websockets (We used Socket.io, but it would be essentially
unchanged in something like SockJS as we discussed) as an interface
between the browser and Redis. Redis has clients in many languages,
including the NodeJS client that we used. It should be trivial to
leverage Redis using whichever technological platform we choose to
use. 

# What We Learned

We initially set out to build a system in which the browser talked to
a backend non-web server over AMQP. We discovered that speaking a
wire-level protocol directly from the browser did not offer the
additional simplicity and division of responsibilities that we were
hoping for. In the wake of our disappointment, we decided that it
would be simplest to use Websockets, especially since there are
implementations of SockJS on many different platforms. RabbitMQ is
still an excellent data transport software, but it seems upon closer
inspection that the problem lies more in the storage of the data,
rather than the transport. RabbitMQ makes more sense in the context of
a data pipeline between Server+Redis instances in a more distributed
topology, if we ever get to that point.

# Caveats

Redis is an in-memory data store. All of redis's useful features stem
from its greatest weakness: It resides in memory. Redis will likely be
the optimal solution to our data storage problem if we can feasibly
fit the working data set into Redis all at once. Other than that, all
of the operations in Redis are O(log(n)) operations on the size of the
structure stored at a given key in redis at worst. Obviously
retrieving or deleting N elements will remain at O(n), however.

# Data structures stored in Redis
Each instance of data stored in redis is serialized JSON. We stored an
overlay as

	overlay = { overlayId: int,
                name:      String }

and a feature as

	feature = { overlayId: int,
	            featureId: int,
				lat:       int,
				lon:       int }


# Actual Redis Data Structures Used

We used two of the built-in structures that Redis provides to access
the overlay and feature structures.

We stored overlays in a Redis hash-map. This allows us to access a
given overlay by name, using a command such as `HGET "demo"` to
retrieve the overlay object for the demo overlay.

We stored features in a Redis sorted set. The name of the set is
features:overlayId. So if our demo overlay was at id 1234, we could
access its features with `GET features:1234`. We can sort the set by
any field we would like. In the demo, it is sorted by featureId,
however, it might be more beneficial to use other fields, such as
timestamp, or even to store it in an unsorted fashion. Sorting by
featureId allows for easy deletion of points by featureId. 
