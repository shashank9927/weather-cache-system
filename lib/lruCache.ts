class Node<K, V> {
    key: K;
    value: V;
    lastFetched: number;
    prev: Node<K, V> | null = null;
    next: Node<K, V> | null = null;

    constructor(key: K, value: V, lastFetched: number = Date.now()) {
        this.key = key;
        this.value = value;
        this.lastFetched = lastFetched;
    }
}

class DoublyLinkedList<K, V> {
    head: Node<K, V>;
    tail: Node<K, V>;

    constructor() {
        this.head = new Node<K, V>(null as any, null as any);
        this.tail = new Node<K, V>(null as any, null as any);
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    addToHead(node: Node<K, V>): void {
        node.prev = this.head;
        node.next = this.head.next;
        this.head.next!.prev = node;
        this.head.next = node;
    }

    removeNode(node: Node<K, V>): void {
        const prevNode = node.prev;
        const nextNode = node.next;
        prevNode!.next = nextNode;
        nextNode!.prev = prevNode;
    }

    moveToHead(node: Node<K, V>): void {
        this.removeNode(node);
        this.addToHead(node);
    }

    removeTail(): Node<K, V> | null {
        const lruNode = this.tail.prev;
        if (lruNode === this.head) {
            return null;
        }
        this.removeNode(lruNode!);
        return lruNode;
    }
}

export class LRUCache<K, V> {
    private capacity: number;
    private cache: Map<K, Node<K, V>>;
    private list: DoublyLinkedList<K, V>;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
        this.list = new DoublyLinkedList();
    }

    get(key: K): { value: V; lastFetched: number } | null {
        const node = this.cache.get(key);
        if (!node) {
            return null;
        }

        this.list.moveToHead(node);
        return { value: node.value, lastFetched: node.lastFetched };
    }

    set(key: K, value: V, lastFetched: number = Date.now()): void {
        const existingNode = this.cache.get(key);

        if (existingNode) {
            existingNode.value = value;
            existingNode.lastFetched = lastFetched;
            this.list.moveToHead(existingNode);
        } else {
            const newNode = new Node(key, value, lastFetched);
            this.cache.set(key, newNode);
            this.list.addToHead(newNode);

            if (this.cache.size > this.capacity) {
                const lruNode = this.list.removeTail();
                if (lruNode) {
                    this.cache.delete(lruNode.key);
                    console.log(`Evicted from L1 Cache: ${String(lruNode.key)}`);
                }
            }
        }
    }

    size(): number {
        return this.cache.size;
    }

    getAllEntries(): Array<{ key: K; value: V; lastFetched: number }> {
        const entries: Array<{ key: K; value: V; lastFetched: number }> = [];
        let current = this.list.head.next;

        while (current && current !== this.list.tail) {
            entries.push({
                key: current.key,
                value: current.value,
                lastFetched: current.lastFetched,
            });
            current = current.next;
        }

        return entries;
    }

    clear(): void {
        this.cache.clear();
        this.list = new DoublyLinkedList();
    }

    getCapacity(): number {
        return this.capacity;
    }

    resize(newCapacity: number): void {
        if (newCapacity < 1) return;

        this.capacity = newCapacity;

        while (this.cache.size > this.capacity) {
            const lruNode = this.list.removeTail();
            if (lruNode) {
                this.cache.delete(lruNode.key);
                console.log(`Evicted during resize: ${lruNode.key}`);
            }
        }

        console.log(`Cache resized to ${newCapacity}`);
    }
}

declare global {
    var _lruCacheInstance: LRUCache<string, any> | undefined;
}

export const lruCache: LRUCache<string, any> =
    global._lruCacheInstance || new LRUCache<string, any>(100);

if (!global._lruCacheInstance) {
    global._lruCacheInstance = lruCache;
    console.log('LRU Cache initialized (Capacity: 100)');
}
