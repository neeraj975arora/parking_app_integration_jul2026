"""Add user_vehicles table and enhance parking_sessions

Revision ID: vehicle_session_enhancement_001
Revises: 76aad77a380f
Create Date: 2025-01-28 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'vehicle_session_enhancement_001'
down_revision = '76aad77a380f'
branch_labels = None
depends_on = None


def upgrade():
    """Apply the migration"""
    
    # Create user_vehicles table
    op.create_table('user_vehicles',
        sa.Column('vehicle_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('registration_number', sa.String(length=20), nullable=False),
        sa.Column('vehicle_name', sa.String(length=100), nullable=True),
        sa.Column('make', sa.String(length=50), nullable=True),
        sa.Column('model', sa.String(length=50), nullable=True),
        sa.Column('year', sa.Integer(), nullable=True),
        sa.Column('vehicle_type', sa.String(length=20), nullable=True),
        sa.Column('color', sa.String(length=30), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('vehicle_id'),
        sa.UniqueConstraint('user_id', 'registration_number', name='uix_user_registration')
    )
    
    # Create indexes for user_vehicles
    op.create_index('idx_user_vehicles_user_id', 'user_vehicles', ['user_id'], unique=False)
    op.create_index('idx_user_vehicles_active', 'user_vehicles', ['user_id', 'is_active'], unique=False)
    op.create_index('idx_user_vehicles_registration', 'user_vehicles', ['registration_number'], unique=False)
    
    # Add new columns to parking_sessions table
    with op.batch_alter_table('parking_sessions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('vehicle_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('payment_status', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('payment_method', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=True))
        batch_op.add_column(sa.Column('receipt_url', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('session_status', sa.String(length=20), nullable=True))
        batch_op.create_foreign_key('fk_parking_sessions_vehicle_id', 'user_vehicles', ['vehicle_id'], ['vehicle_id'])
    
    # Create indexes for enhanced parking_sessions
    op.create_index('idx_parking_session_user_vehicle', 'parking_sessions', ['user_id', 'vehicle_id'], unique=False)
    op.create_index('idx_parking_session_status', 'parking_sessions', ['user_id', 'session_status'], unique=False)
    op.create_index('idx_parking_session_payment_status', 'parking_sessions', ['payment_status'], unique=False)
    
    # Set default values for existing records
    op.execute("UPDATE parking_sessions SET payment_status = 'pending' WHERE payment_status IS NULL")
    op.execute("UPDATE parking_sessions SET session_status = 'completed' WHERE end_time IS NOT NULL AND session_status IS NULL")
    op.execute("UPDATE parking_sessions SET session_status = 'active' WHERE end_time IS NULL AND session_status IS NULL")
    
    # Set default values for new columns in user_vehicles
    op.execute("ALTER TABLE user_vehicles ALTER COLUMN vehicle_type SET DEFAULT 'car'")
    op.execute("ALTER TABLE user_vehicles ALTER COLUMN is_active SET DEFAULT true")
    op.execute("ALTER TABLE user_vehicles ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP")
    op.execute("ALTER TABLE user_vehicles ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP")
    
    # Set default values for new columns in parking_sessions
    op.execute("ALTER TABLE parking_sessions ALTER COLUMN payment_status SET DEFAULT 'pending'")
    op.execute("ALTER TABLE parking_sessions ALTER COLUMN session_status SET DEFAULT 'active'")


def downgrade():
    """Reverse the migration"""
    
    # Drop indexes for parking_sessions
    op.drop_index('idx_parking_session_payment_status', table_name='parking_sessions')
    op.drop_index('idx_parking_session_status', table_name='parking_sessions')
    op.drop_index('idx_parking_session_user_vehicle', table_name='parking_sessions')
    
    # Remove new columns from parking_sessions
    with op.batch_alter_table('parking_sessions', schema=None) as batch_op:
        batch_op.drop_constraint('fk_parking_sessions_vehicle_id', type_='foreignkey')
        batch_op.drop_column('session_status')
        batch_op.drop_column('receipt_url')
        batch_op.drop_column('total_amount')
        batch_op.drop_column('payment_method')
        batch_op.drop_column('payment_status')
        batch_op.drop_column('vehicle_id')
    
    # Drop indexes for user_vehicles
    op.drop_index('idx_user_vehicles_registration', table_name='user_vehicles')
    op.drop_index('idx_user_vehicles_active', table_name='user_vehicles')
    op.drop_index('idx_user_vehicles_user_id', table_name='user_vehicles')
    
    # Drop user_vehicles table
    op.drop_table('user_vehicles')