PLAN_CONFIG = {
    'STARTER': {
        'monthly_bookings': 10,
        'max_users': 1,
        'max_images_before': 2,
        'max_images_after': 2,
        'max_customers': 1000,
        'indemnity_history_limit': 0, # No history saved
        'buffer_timer': False,
    },
    'PRO': {
        'monthly_bookings': 60,
        'max_users': 10,
        'max_images_before': 10,
        'max_images_after': 10,
        'max_customers': float('inf'), # Unlimited
        'indemnity_history_limit': 5,
        'buffer_timer': True,
    },
    'ENTERPRISE': {
        'monthly_bookings': float('inf'),
        'max_users': 50,
        'max_images_before': 25,
        'max_images_after': 25,
        'max_customers': float('inf'), # Unlimited
        'indemnity_history_limit': float('inf'),
        'buffer_timer': True,
    }
}