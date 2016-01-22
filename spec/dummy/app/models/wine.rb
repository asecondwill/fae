class Wine < ActiveRecord::Base
  include Fae::Concerns::Models::Base

  has_many :releases
  has_many :winemakers

  has_many :oregon_winemakers, -> { where(region_type: 1) },
    class_name: 'Winemaker',
    source: :winemakers

  has_many :california_winemakers, -> { where(region_type: 2) },
    class_name: 'Winemaker',
    source: :winemakers

  validates :name_en, :name_zh, :name_ja, presence: true

  translate :name

  # def active_model_serializer
  #   WineSerializer
  # end

  def fae_display_field
    name_en
  end

  def self.for_fae_index
    order(:position)
  end

end
