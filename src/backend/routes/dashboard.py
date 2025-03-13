from flask import Blueprint, request, jsonify
from models.dashboard import Dashboard, Widget, db
from datetime import datetime
import uuid 
dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('', methods=['GET'])
def get_dashboards():
    try:
        dashboards = Dashboard.query.all()
        return jsonify([dashboard.to_dict() for dashboard in dashboards])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('', methods=['POST'])
def create_dashboard():
    try:
        data = request.json
        new_dashboard = Dashboard(
            title=data.get('title', 'New Dashboard'),
            description=data.get('description', ''),
            layout=data.get('layout', {}),
        )
        db.session.add(new_dashboard)
        db.session.commit()
        return jsonify(new_dashboard.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('<uuid:dashboard_id>', methods=['PUT'])
def update_dashboard(dashboard_id):
    try:
        dashboard = Dashboard.query.get_or_404(dashboard_id)
        data = request.json
        
        if 'title' in data:
            dashboard.title = data['title']
        if 'description' in data:
            dashboard.description = data['description']
        if 'layout' in data:
            dashboard.layout = data['layout']
        
        dashboard.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(dashboard.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/<uuid:dashboard_id>', methods=['DELETE'])
def delete_dashboard(dashboard_id):
    try:
        dashboard = Dashboard.query.get_or_404(dashboard_id)
        db.session.delete(dashboard)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/<uuid:dashboard_id>/widgets', methods=['POST'])
def add_widget(dashboard_id):
    try:
        dashboard = Dashboard.query.get_or_404(dashboard_id)
        data = request.json
        
        position = data.get('position', {'x': 0, 'y': 0, 'w': 6, 'h': 6})

        # Ensure y is a valid number (default to 0 if null)
        position['y'] = position.get('y', 0) if position.get('y') is not None else 0

        new_widget = Widget(
            dashboard_id=dashboard_id,
            type=data['type'],
            title=data.get('title', 'New Widget'),
            description=data.get('description', ''),
            config=data.get('config', {}),
            position=position,
            data_source=data.get('data_source')
        )
        
        db.session.add(new_widget)
        db.session.commit()
        return jsonify(new_widget.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/widgets/<int:widget_id>', methods=['PUT'])
def update_widget(widget_id):
    try:
        widget = Widget.query.get_or_404(widget_id)
        data = request.json
        
        if 'title' in data:
            widget.title = data['title']
        if 'description' in data:
            widget.description = data['description']
        if 'config' in data:
            widget.config = data['config']
        if 'position' in data:
            widget.position = data['position']
        if 'data_source' in data:
            widget.data_source = data['data_source']
        
        widget.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(widget.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/widgets/<int:widget_id>', methods=['DELETE'])
def delete_widget(widget_id):
    try:
        widget = Widget.query.get_or_404(widget_id)
        db.session.delete(widget)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/widgets/<int:widget_id>/data', methods=['GET'])
def get_widget_data(widget_id):
    try:
        widget = Widget.query.get_or_404(widget_id)
        # Here you would implement the logic to fetch data for the widget
        # This is just a placeholder that returns sample data
        sample_data = {
            'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
            'datasets': [{
                'label': 'Sample Data',
                'data': [65, 59, 80, 81, 56]
            }]
        }
        return jsonify(sample_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500 